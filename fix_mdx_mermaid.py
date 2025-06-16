#!/usr/bin/env python3
"""
Fix MDX mermaid diagrams that are formatted incorrectly.
The issue is that mermaid diagrams written on single lines confuse the MDX parser.
This script will reformat them to proper multi-line format.
"""
import os
import re
import glob

def fix_mermaid_in_frame(content):
    """Fix mermaid diagrams inside Frame components"""
    
    # Pattern to match Frame components with mermaid on single lines
    pattern = r'<Frame>\s*```\s*mermaid\s+([^`]+?)```\s*</Frame>'
    
    def reformat_mermaid(match):
        mermaid_content = match.group(1).strip()
        
        # Split on common mermaid keywords and arrows to create proper lines
        # Handle different diagram types
        formatted_lines = []
        
        if 'graph TD' in mermaid_content or 'graph LR' in mermaid_content:
            # Handle graph diagrams
            # Extract the graph type
            if 'graph TD' in mermaid_content:
                graph_type = 'graph TD'
                content_after = mermaid_content.split('graph TD', 1)[1].strip()
            else:
                graph_type = 'graph LR'
                content_after = mermaid_content.split('graph LR', 1)[1].strip()
                
            formatted_lines.append(graph_type)
            
            # Split on arrows and format each connection
            connections = re.split(r'(?=\w+\[|\w+\(|\w+ -->)', content_after)
            for conn in connections:
                conn = conn.strip()
                if conn and not conn.startswith('-->'):
                    # Split on arrows to create separate lines
                    if '-->' in conn:
                        parts = conn.split('-->')
                        for i, part in enumerate(parts):
                            if i == 0:
                                formatted_lines.append(f"  {part.strip()}")
                            else:
                                if i < len(parts) - 1:
                                    formatted_lines.append(f"  --> {part.strip()}")
                                else:
                                    formatted_lines.append(f"  --> {part.strip()}")
                    else:
                        formatted_lines.append(f"  {conn}")
                        
        elif 'sequenceDiagram' in mermaid_content:
            # Handle sequence diagrams
            formatted_lines.append('sequenceDiagram')
            content_after = mermaid_content.split('sequenceDiagram', 1)[1].strip()
            
            # Split on participant and arrows
            parts = re.split(r'(?=participant |\w+->>|\w+-->>)', content_after)
            for part in parts:
                part = part.strip()
                if part:
                    formatted_lines.append(f"  {part}")
        else:
            # Fallback: just split on spaces and try to format nicely
            words = mermaid_content.split()
            current_line = ""
            for word in words:
                if word in ['graph', 'sequenceDiagram', 'participant']:
                    if current_line:
                        formatted_lines.append(f"  {current_line.strip()}")
                    current_line = word
                elif '-->' in word or '-->' in current_line:
                    current_line += f" {word}"
                    if not word.endswith('-->'):
                        formatted_lines.append(f"  {current_line.strip()}")
                        current_line = ""
                else:
                    current_line += f" {word}"
            
            if current_line:
                formatted_lines.append(f"  {current_line.strip()}")
        
        # Create the properly formatted Frame
        formatted_mermaid = '\n'.join(formatted_lines)
        return f'<Frame>\n```mermaid\n{formatted_mermaid}\n```\n</Frame>'
    
    # Apply the transformation
    fixed_content = re.sub(pattern, reformat_mermaid, content, flags=re.DOTALL)
    return fixed_content

def fix_mdx_file(file_path):
    """Fix a single MDX file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        content = fix_mermaid_in_frame(content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {file_path}")
            return True
        else:
            print(f"ℹ️ No changes needed for {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function to fix all MDX files"""
    print("🔧 Fixing MDX mermaid diagrams...")
    
    # Find all MDX files
    mdx_files = glob.glob('/workspaces/pixelated/src/content/**/*.mdx', recursive=True)
    
    fixed_count = 0
    total_count = len(mdx_files)
    
    for file_path in mdx_files:
        if fix_mdx_file(file_path):
            fixed_count += 1
    
    print(f"\n🎉 Completed! Fixed {fixed_count} out of {total_count} MDX files.")

if __name__ == "__main__":
    main()
