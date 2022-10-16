NAIFU: NovelAI AI Image Frontend Ultimate

This is the NovelAI Image Generation model, packaged together with their backend and
frontend for a coherent experience.

This works on Windows/Linux for Nvidia cards with at least 8GB of VRAM.

Windows Install:
1) Install Python, checking "Add Python to PATH". https://www.python.org/downloads/windows/
2) Extract or copy files from program.zip to this directory (not to program/)
3) Run setup.bat from Explorer.

Linux Install:
1) ./setup.sh
2) (optional) ./venv/bin/python -m pip install xformers

Running:
1) Run run.bat or run.sh
2) Open http://localhost:6969/ in your browser.
3) (Optional) Mobile usage: open http://computername:6969, http://computername.local:6969, or http://IPADDRESS:6969

FAQ
Q: What did you change?
A: I hacked everything together to run easily on consumer hardware. Do diffs if you care.

Q: What about hyperparameters?
A: They don't appear to be necessary.

Q: What about other models?
A: Change your run script.

Q: What about AMD/OSX/CPU?
A: Good luck.

Q: What is frontend-src.zip?
A: Source code for the hacked-up frontend, for future modding.
