import { RequirementInput, ArchitectureResponse, TerraformRequest, TerraformResponse } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const log = (msg: string, data?: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[ArchGen API] ${msg}`, data ?? "");
  }
};

// ─── Auth operations ───────────────────────────────────────────────────────

export async function getCleanErrorMessage(response: Response, defaultMsg: string): Promise<string> {
  const errText = await response.text();
  try {
    const parsed = JSON.parse(errText);
    if (parsed.detail) {
      if (Array.isArray(parsed.detail)) {
        return parsed.detail.map((d: any) => {
          if (d.loc && Array.isArray(d.loc) && d.loc.length > 0) {
            const field = d.loc[d.loc.length - 1];
            const fieldLabel = String(field).replace(/_/g, " ");
            const capitalizedField = fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1);
            return `${capitalizedField}: ${d.msg}`;
          }
          return d.msg || "Invalid input";
        }).join(". ");
      } else if (typeof parsed.detail === "string") {
        return parsed.detail;
      }
    }
    return parsed.message || errText || defaultMsg;
  } catch (e) {
    return errText || defaultMsg;
  }
}

export async function registerUser(
  username: string,
  password: string,
  email: string
): Promise<any> {
  log("Registering user", { username, email });
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email }),
  });

  if (!response.ok) {
    const message = await getCleanErrorMessage(response, "Registration failed");
    throw new Error(message);
  }

  return response.json();
}

export async function loginUser(
  username: string,
  password: string
): Promise<any> {
  log("Logging in user", { username });
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const message = await getCleanErrorMessage(response, "Invalid username or password");
    throw new Error(message);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Session refresh failed");
  }

  const data = await response.json();
  return data.access_token;
}

export async function getCurrentUser(token: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to load current user");
  }

  return response.json();
}

// ─── Core Multi-Agent Pipeline ─────────────────────────────────────────────

export async function generateArchitecture(
  input: RequirementInput
): Promise<ArchitectureResponse> {
  log("Generating architecture", input);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 seconds timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-architecture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to generate architecture: ${errorText || response.statusText}`
      );
    }

    const data: ArchitectureResponse = await response.json();
    log("Architecture generated", { nodes: data.nodes.length, edges: data.edges.length });
    return data;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Architecture generation timed out after 300 seconds. Please try again.");
    }
    throw err;
  }
}

export async function generateTerraform(
  request: TerraformRequest
): Promise<TerraformResponse> {
  log("Generating Terraform HCL", { nodes: request.nodes.length });
  const response = await fetch(`${API_BASE_URL}/api/generate-terraform`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to generate Terraform: ${errorText || response.statusText}`
    );
  }

  return response.json();
}

export async function optimizeCost(
  nodes: any[],
  services: any[]
): Promise<any> {
  log("Running FinOps optimization scan", { nodeCount: nodes.length });
  const response = await fetch(`${API_BASE_URL}/api/optimize-cost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, services }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to optimize cost: ${errText}`);
  }

  return response.json();
}

export async function validateSecurity(
  nodes: any[],
  services: any[]
): Promise<any> {
  log("Running security compliance validation scan", { nodeCount: nodes.length });
  const response = await fetch(`${API_BASE_URL}/api/validate-architecture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, services }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to validate security: ${errText}`);
  }

  return response.json();
}

export async function explainArchitecture(
  nodes: any[],
  services: any[]
): Promise<any> {
  log("Requesting AI architecture explanation");
  const response = await fetch(`${API_BASE_URL}/api/explain-architecture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, services }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to explain architecture: ${errText}`);
  }

  return response.json();
}

// ─── Project Persistence (MongoDB CRUD) ────────────────────────────────────

export async function saveProject(
  projectData: any,
  token: string
): Promise<any> {
  log("Saving project", { name: projectData.name });
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to save project");
  }

  return response.json();
}

export async function listProjects(token: string): Promise<any[]> {
  log("Listing saved projects");
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to load projects list");
  }

  return response.json();
}

export async function deleteProject(
  projectId: string,
  token: string
): Promise<any> {
  log("Deleting project", { projectId });
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to delete project");
  }

  return response.json();
}

// ─── AI-Assist Graph Refactoring ───────────────────────────────────────────

export async function aiAssistRefactor(
  nodes: any[],
  edges: any[],
  services: any[],
  action: string
): Promise<any> {
  log("Triggering AI-Assist refactor", { action, nodeCount: nodes.length });
  const response = await fetch(`${API_BASE_URL}/api/ai-assist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, edges, services, action }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "AI-Assist refactoring failed");
  }

  return response.json();
}
