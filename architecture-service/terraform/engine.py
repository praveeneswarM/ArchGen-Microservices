import os
import logging
from typing import List, Dict, Any
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger("terraform_engine")

class TerraformEngine:
    def __init__(self):
        # Resolve templates path relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.templates_dir = os.path.join(current_dir, "templates")
        
        if not os.path.exists(self.templates_dir):
            os.makedirs(self.templates_dir, exist_ok=True)
            logger.warning(f"Created empty templates directory: {self.templates_dir}")
            
        self.env = Environment(loader=FileSystemLoader(self.templates_dir), trim_blocks=True, lstrip_blocks=True)
        
        # Add custom filter to sanitize node IDs for strict Azure/AWS naming rules
        def sanitize_id(value: str) -> str:
            import re
            # Remove all non-alphanumeric chars, lowercased.
            safe_val = re.sub(r'[^a-z0-9]', '', str(value).lower())
            # Truncate to 10 chars to prevent max-length violations (like Storage 24-char limit)
            return safe_val[:10] if safe_val else "id"
            
        self.env.filters['sanitize_id'] = sanitize_id

    def generate(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], services: List[Dict[str, Any]], provider: str) -> Dict[str, str]:
        """
        Renders Jinja2 templates into multi-file compilable Terraform blocks based on nodes & services.
        Validates for duplicate identical modules and namespaces resources.
        """
        logger.info(f"Rendering Terraform templates for cloud provider: {provider}")
        try:
            # Pre-processing: deduplicate identical nodes (based on exact same id)
            unique_nodes = {n["id"]: n for n in nodes}.values()
            nodes = list(unique_nodes)
            
            # Detect shared infrastructural needs
            has_backend = any(n.get("type") == "BackendNode" for n in nodes)
            has_frontend = any(n.get("type") == "FrontendNode" for n in nodes)
            has_database = any(n.get("type") == "DatabaseNode" for n in nodes)

            # Map parameters
            context = {
                "nodes": nodes,
                "edges": edges,
                "services": services,
                "provider": provider.lower(),
                "has_backend": has_backend,
                "has_frontend": has_frontend,
                "has_database": has_database,
            }
            
            provider_lower = provider.lower()
            if provider_lower not in ["azure", "aws", "gcp"]:
                provider_lower = "azure"

            # Dynamically switch the Jinja loader environment based on provider
            provider_env = Environment(
                loader=FileSystemLoader(os.path.join(self.templates_dir, provider_lower)),
                trim_blocks=True, 
                lstrip_blocks=True
            )
            provider_env.filters['sanitize_id'] = self.env.filters['sanitize_id']

            # Load templates
            main_template = provider_env.get_template("main.tf.j2")
            variables_template = provider_env.get_template("variables.tf.j2")
            outputs_template = provider_env.get_template("outputs.tf.j2")
            tfvars_template = provider_env.get_template("terraform.tfvars.j2")
            
            # Render
            main_tf = main_template.render(context)
            variables_tf = variables_template.render(context)
            outputs_tf = outputs_template.render(context)
            tfvars_tf = tfvars_template.render(context)
            
            # Generate deployment guide text dynamically based on provider
            cli_auth = "az login"
            if provider_lower == "aws":
                cli_auth = "aws configure"
            elif provider_lower == "gcp":
                cli_auth = "gcloud auth application-default login"
                
            instructions = (
                f"## Deployment Operations Guide ({provider_lower.upper()})\n\n"
                "1. Ensure you have the Terraform CLI installed (version >= 1.3.0).\n"
                f"2. Authenticate to the cloud provider via CLI: `{cli_auth}`\n"
                "3. Copy the generated files (`main.tf`, `variables.tf`, `outputs.tf`, `terraform.tfvars`) into an empty local folder.\n"
                "4. Provide sensitive values like `db_password` through environment variables (e.g. `TF_VAR_db_password`) or a secret store.\n"
                "5. Copy `terraform.tfvars` only for non-secret inputs.\n"
                "6. Execute initialization:\n"
                "   ```bash\n"
                "   terraform init\n"
                "   ```\n"
                "7. Preview deployment plan changes:\n"
                "   ```bash\n"
                "   terraform plan\n"
                "   ```\n"
                f"8. Provision infrastructure on {provider_lower.upper()}:\n"
                "   ```bash\n"
                "   terraform apply -auto-approve\n"
                "   ```"
            )
            
            logger.info("Successfully generated multi-file HCL templates.")
            return {
                "main_tf": main_tf,
                "variables_tf": variables_tf,
                "outputs_tf": outputs_tf,
                "terraform_tfvars": tfvars_tf,
                "instructions": instructions
            }
        except Exception as e:
            logger.error(f"Failed rendering Terraform HCL templates: {e}")
            raise e
