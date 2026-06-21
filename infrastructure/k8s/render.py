import os
import re
import yaml

SERVICES = ['frontend', 'api-gateway', 'auth-service', 'project-service', 'architecture-service']
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def render_ingress(values, release_name, service_name):
    if not values.get("ingress", {}).get("enabled", False):
        return ""
    
    annotations_str = ""
    for k, v in values["ingress"].get("annotations", {}).items():
        annotations_str += f"    {k}: {v}\n"
        
    hosts_str = ""
    port_number = 80 if service_name == "frontend" else 8080
    for host_entry in values["ingress"]["hosts"]:
        hosts_str += f"    - host: {host_entry['host']}\n      http:\n        paths:\n"
        for path_entry in host_entry["paths"]:
            hosts_str += f"          - path: {path_entry['path']}\n"
            hosts_str += f"            pathType: {path_entry['pathType']}\n"
            hosts_str += f"            backend:\n"
            hosts_str += f"              service:\n"
            hosts_str += f"                name: {release_name}-{service_name}\n"
            hosts_str += f"                port:\n"
            hosts_str += f"                  number: {port_number}\n"
            
    content = f"""apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {release_name}-{service_name}-ingress
  labels:
    app: {service_name}
  annotations:
{annotations_str.rstrip()}
spec:
  ingressClassName: {values["ingress"]["className"]}
  rules:
{hosts_str.rstrip()}
"""
    return content

def render_secrets_provider(values, release_name, service_name):
    if not values.get("keyvault", {}).get("enabled", False):
        return ""
        
    secrets_str = ""
    for secret in values["keyvault"]["secrets"]:
        secrets_str += f"        - |\n"
        secrets_str += f"          objectName: {secret['name']}\n"
        secrets_str += f"          objectType: secret\n"
        secrets_str += f"          objectAlias: {secret['alias']}\n"
        
    content = f"""apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: {release_name}-{service_name}-keyvault-provider
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "false"
    clientID: "{values["keyvault"]["clientId"]}"
    keyvaultName: "{values["keyvault"]["name"]}"
    objects: |
      array:
{secrets_str.rstrip()}
    tenantId: "{values["keyvault"]["tenantId"]}"
"""
    return content

def render_template(filename, content, values, release_name, service_name):
    # Specialized handlers for loops
    if filename == "ingress.yaml":
        return render_ingress(values, release_name, service_name)
    elif filename == "secrets-provider.yaml":
        return render_secrets_provider(values, release_name, service_name)

    # Strip empty nodeSelector/tolerations/affinity blocks cleanly first
    # (Must run before global {{- end }} tags are stripped)
    for block_name in ["nodeSelector", "affinity", "tolerations"]:
        pattern = r'\{\{-?\s*with\s+\.Values\.' + block_name + r'\s*-?\}\}.*?\{\{-?\s*end\s*-?\}\}'
        content = re.sub(pattern, '', content, flags=re.DOTALL)

    # Resolve top-level conditionals
    if "autoscaling" in content:
        enabled = values.get("autoscaling", {}).get("enabled", False)
        if not enabled:
            if content.strip().startswith("{{- if .Values.autoscaling.enabled -}}") and content.strip().endswith("{{- end }}"):
                return ""

    # Remove the wrapper lines for conditionals
    content = re.sub(r'\{\{-?\s*if\s+.*?\}\}', '', content)
    content = re.sub(r'\{\{-?\s*end\s*\}\}', '', content)
    
    # Replace Release Name
    content = content.replace("{{ .Release.Name }}", release_name)
    content = content.replace("{{ $.Release.Name }}", release_name)
    
    # Image values
    if "image" in values:
        content = content.replace("{{ .Values.image.repository }}", values["image"]["repository"])
        content = content.replace("{{ .Values.image.tag }}", str(values["image"]["tag"]))
        content = content.replace("{{ .Values.image.pullPolicy }}", values["image"]["pullPolicy"])
        
    # Service values
    if "service" in values:
        content = content.replace("{{ .Values.service.port }}", str(values["service"]["port"]))
        content = content.replace("{{ .Values.service.type }}", values["service"]["type"])
        
    # Replica count
    content = content.replace("{{ .Values.replicaCount }}", str(values.get("replicaCount", 1)))
    
    # Key Vault metadata replacements (flat strings)
    if "keyvault" in values:
        content = content.replace("{{ .Values.keyvault.clientId | quote }}", f'"{values["keyvault"]["clientId"]}"')
        content = content.replace("{{ .Values.keyvault.name | quote }}", f'"{values["keyvault"]["name"]}"')
        content = content.replace("{{ .Values.keyvault.tenantId | quote }}", f'"{values["keyvault"]["tenantId"]}"')

    # Resources configuration with precise nindent indentation matching
    if "resources" in values:
        resources_block = "limits:\n  cpu: {}\n  memory: {}\nrequests:\n  cpu: {}\n  memory: {}".format(
            values["resources"].get("limits", {}).get("cpu", "200m"),
            values["resources"].get("limits", {}).get("memory", "256Mi"),
            values["resources"].get("requests", {}).get("cpu", "100m"),
            values["resources"].get("requests", {}).get("memory", "128Mi")
        )
        def replace_resources(match):
            indent_size = int(match.group(1))
            indent = " " * indent_size
            indented = resources_block.replace("\n", "\n" + indent)
            return "\n" + indent + indented

        content = re.sub(
            r'\s*\{\{-?\s*toYaml\s+\.Values\.resources\s*\|\s*nindent\s+(\d+)\s*-?\}\}', 
            replace_resources, 
            content
        )

    # Autoscaling values
    if "autoscaling" in values:
        content = content.replace("{{ .Values.autoscaling.minReplicas }}", str(values["autoscaling"]["minReplicas"]))
        content = content.replace("{{ .Values.autoscaling.maxReplicas }}", str(values["autoscaling"]["maxReplicas"]))
        content = content.replace("{{ .Values.autoscaling.targetCPUUtilizationPercentage }}", str(values["autoscaling"]["targetCPUUtilizationPercentage"]))
    
    return content.strip() + "\n"

def main():
    for env in ['dev', 'prod']:
        release_name = f"archgen-{env}"
        out_dir = os.path.join(BASE_DIR, 'manifests', env)
        
        # Clean existing manifests in destination directory
        if os.path.exists(out_dir):
            for f in os.listdir(out_dir):
                os.remove(os.path.join(out_dir, f))
        os.makedirs(out_dir, exist_ok=True)
        print(f"Rendering manifests for environment: {env} -> {out_dir}")
        
        for service in SERVICES:
            service_dir = os.path.join(BASE_DIR, service)
            values_file = os.path.join(service_dir, f"values-{env}.yaml")
            
            if not os.path.exists(values_file):
                print(f"Warning: values file {values_file} not found. Skipping.")
                continue
                
            with open(values_file, 'r') as f:
                values = yaml.safe_load(f) or {}
                
            templates_dir = os.path.join(service_dir, 'templates')
            if not os.path.exists(templates_dir):
                continue
                
            for filename in os.listdir(templates_dir):
                if not filename.endswith('.yaml'):
                    continue
                    
                template_path = os.path.join(templates_dir, filename)
                with open(template_path, 'r') as tf:
                    template_content = tf.read()
                    
                rendered = render_template(filename, template_content, values, release_name, service)
                
                # Write non-empty manifests to output
                if rendered.strip():
                    out_filename = f"{service}-{filename}"
                    out_path = os.path.join(out_dir, out_filename)
                    with open(out_path, 'w') as wf:
                        wf.write(rendered)
                    print(f"  Generated: {out_filename}")

if __name__ == '__main__':
    main()
