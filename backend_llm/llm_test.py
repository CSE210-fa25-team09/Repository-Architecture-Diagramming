import os
import shutil
import subprocess
import requests
from pathlib import Path
import textwrap
import json

# -----------------------------
# CONFIG
# -----------------------------
HF_API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct"
HF_TOKEN = os.getenv("HF_TOKEN")  # set env var: export HF_TOKEN="hf_XXXX"

OUTPUT_DIR = "gitdiagram_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -----------------------------
# GitDiagram prompts
# -----------------------------
SYSTEM_FIRST_PROMPT = """<PUT YOUR FULL FIRST PROMPT HERE>"""
SYSTEM_SECOND_PROMPT = """<PUT YOUR FULL SECOND PROMPT HERE>"""
SYSTEM_THIRD_PROMPT = """<PUT YOUR FULL THIRD PROMPT HERE>"""

# -----------------------------
# Helper: call HuggingFace LLM
# -----------------------------
def hf_generate(system_prompt, user_prompt, max_tokens=4096, temperature=0.4):
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": f"<system>\n{system_prompt}\n</system>\n<user>\n{user_prompt}\n</user>",
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": temperature
        }
    }

    resp = requests.post(HF_API_URL, headers=headers, json=payload)
    resp.raise_for_status()

    data = resp.json()

    # HF returns either dict or list depending on backend
    if isinstance(data, list):
        return data[0]["generated_text"]
    elif "generated_text" in data:
        return data["generated_text"]
    else:
        raise RuntimeError("Unexpected HF response format: " + json.dumps(data)[:500])

# -----------------------------
# Clone GitHub repo
# -----------------------------
def clone_repo(github_url, clone_dir="repo_tmp"):
    if os.path.exists(clone_dir):
        shutil.rmtree(clone_dir)
    subprocess.run(["git", "clone", "--depth", "1", github_url, clone_dir], check=True)
    return clone_dir

# -----------------------------
# Build file tree string
# -----------------------------
def build_file_tree(root_dir):
    tree_lines = []
    for root, dirs, files in os.walk(root_dir):
        rel = os.path.relpath(root, root_dir)
        indent = "  " * (len(Path(rel).parts) if rel != "." else 0)
        tree_lines.append(f"{indent}{os.path.basename(root)}/")
        for f in files:
            tree_lines.append(f"{indent}  {f}")
    return "\n".join(tree_lines)

# -----------------------------
# Extract README
# -----------------------------
def extract_readme(clone_dir):
    for name in ["README.md", "readme.md", "README", "Readme.md"]:
        p = os.path.join(clone_dir, name)
        if os.path.exists(p):
            return Path(p).read_text()
    return "(No README found)"

# -----------------------------
# MAIN PIPELINE
# -----------------------------
def generate_mermaid_from_repo(github_url):

    print("Cloning repo...")
    repo = clone_repo(github_url)

    print("Building file tree...")
    file_tree = build_file_tree(repo)

    print("Extracting README...")
    readme = extract_readme(repo)

    # -------------------------
    # PROMPT 1 → explanation
    # -------------------------
    print("\nRunning Prompt 1...")
    user_1 = f"<file_tree>\n{file_tree}\n</file_tree>\n\n<readme>\n{readme}\n</readme>"
    explanation_raw = hf_generate(SYSTEM_FIRST_PROMPT, user_1)

    # Extract <explanation>...</explanation>
    explanation = explanation_raw.split("<explanation>")[-1].split("</explanation>")[0].strip()

    Path(f"{OUTPUT_DIR}/explanation.txt").write_text(explanation)
    print("Saved explanation.")

    # -------------------------
    # PROMPT 2 → component mapping
    # -------------------------
    print("\nRunning Prompt 2...")
    user_2 = (
        f"<explanation>\n{explanation}\n</explanation>\n"
        f"<file_tree>\n{file_tree}\n</file_tree>"
    )
    compmap_raw = hf_generate(SYSTEM_SECOND_PROMPT, user_2)
    compmap = compmap_raw.split("<component_mapping>")[-1].split("</component_mapping>")[0].strip()

    Path(f"{OUTPUT_DIR}/component_mapping.txt").write_text(compmap)
    print("Saved component mapping.")

    # -------------------------
    # PROMPT 3 → Mermaid.js diagram
    # -------------------------
    print("\nRunning Prompt 3...")
    user_3 = (
        f"<explanation>\n{explanation}\n</explanation>\n"
        f"<component_mapping>\n{compmap}\n</component_mapping>"
    )
    diagram_code = hf_generate(SYSTEM_THIRD_PROMPT, user_3)

    # save .mmd
    Path(f"{OUTPUT_DIR}/diagram.mmd").write_text(diagram_code)
    print("Saved diagram.mmd!")

    return explanation, compmap, diagram_code


# -----------------------------
# RUN FROM COMMAND LINE
# -----------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate Mermaid.js diagram using GitDiagram pipeline + HF API")
    parser.add_argument("repo_url", help="GitHub repo URL, e.g. https://github.com/user/project")
    args = parser.parse_args()

    explanation, compmap, diagram = generate_mermaid_from_repo(args.repo_url)

    print("\nDone!")
    print("Files saved in:", OUTPUT_DIR)
