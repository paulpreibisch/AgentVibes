#!/bin/bash
#
# Fix VS Code Workspace Colors
# Sets the status bar and activity bar to purple for this workspace
#

set -e

WORKSPACE_FILE=".vscode/settings.json"

echo "🎨 Fixing VS Code workspace colors to purple..."

# Create .vscode directory if it doesn't exist
mkdir -p .vscode

# Check if settings.json exists
if [[ ! -f "$WORKSPACE_FILE" ]]; then
    echo "Creating new workspace settings file..."
    cat > "$WORKSPACE_FILE" <<'EOF'
{
    "workbench.colorCustomizations": {
        "statusBar.background": "#7b2cbf",
        "statusBar.foreground": "#ffffff",
        "statusBarItem.hoverBackground": "#9d4edd",
        "activityBar.background": "#7b2cbf",
        "activityBar.foreground": "#ffffff",
        "activityBar.inactiveForeground": "#c9c9c9",
        "titleBar.activeBackground": "#7b2cbf",
        "titleBar.activeForeground": "#ffffff",
        "titleBar.inactiveBackground": "#6a24a8",
        "titleBar.inactiveForeground": "#c9c9c9"
    }
}
EOF
else
    echo "Updating existing workspace settings file..."

    # Use jq if available, otherwise use simple append
    if command -v jq &> /dev/null; then
        # Backup original
        cp "$WORKSPACE_FILE" "${WORKSPACE_FILE}.backup"

        # Merge with jq
        jq '. + {
            "workbench.colorCustomizations": {
                "statusBar.background": "#7b2cbf",
                "statusBar.foreground": "#ffffff",
                "statusBarItem.hoverBackground": "#9d4edd",
                "activityBar.background": "#7b2cbf",
                "activityBar.foreground": "#ffffff",
                "activityBar.inactiveForeground": "#c9c9c9",
                "titleBar.activeBackground": "#7b2cbf",
                "titleBar.activeForeground": "#ffffff",
                "titleBar.inactiveBackground": "#6a24a8",
                "titleBar.inactiveForeground": "#c9c9c9"
            }
        }' "${WORKSPACE_FILE}.backup" > "$WORKSPACE_FILE"

        rm "${WORKSPACE_FILE}.backup"
        echo "✅ Updated using jq"
    else
        echo "⚠️  jq not found - manual update required"
        echo "Please add the following to $WORKSPACE_FILE:"
        echo ""
        cat <<'EOF'
{
    "workbench.colorCustomizations": {
        "statusBar.background": "#7b2cbf",
        "statusBar.foreground": "#ffffff",
        "statusBarItem.hoverBackground": "#9d4edd",
        "activityBar.background": "#7b2cbf",
        "activityBar.foreground": "#ffffff",
        "activityBar.inactiveForeground": "#c9c9c9",
        "titleBar.activeBackground": "#7b2cbf",
        "titleBar.activeForeground": "#ffffff",
        "titleBar.inactiveBackground": "#6a24a8",
        "titleBar.inactiveForeground": "#c9c9c9"
    }
}
EOF
    fi
fi

echo ""
echo "✅ Workspace colors set to purple!"
echo "📁 Settings file: $WORKSPACE_FILE"
echo ""
echo "Restart VS Code or reload the window for changes to take effect."
