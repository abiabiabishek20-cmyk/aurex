# Aurex Windows Installer Plan

This directory contains the Windows desktop agent. The final installer should:

1. Install the agent under a protected per-user application directory.
2. Create the local .env from a secure pairing flow; never embed a device token in the installer.
3. Register the agent for automatic start at Windows logon.
4. Keep the agent connected to the Aurex API over WSS.
5. Restart the agent automatically after an unexpected exit.
6. Provide an uninstall action that removes the startup registration and agent files.
7. Never install arbitrary shell, mouse, keyboard, credential-extraction, or persistence features.

The current install-autostart.ps1 is the development bootstrap. A signed MSIX/EXE installer is a final-integration deliverable.