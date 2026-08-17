import json
import os
import signal
from pathlib import Path
from tkinter import Button, Entry, Label, StringVar, Tk


evidence_root = Path(os.environ["CASCADE_DESKTOP_EVIDENCE_ROOT"])
root = Tk()
root.title("Cascade Desktop Fixture")
root.geometry("480x220+100+100")
root.resizable(False, False)

Label(root, text="Resolution").pack(pady=(24, 4))
resolution = Entry(root, width=44)
resolution.pack()
status = StringVar(value="Waiting")
Label(root, textvariable=status, name="status").pack(pady=12)


def complete() -> None:
    value = resolution.get()
    evidence_root.mkdir(parents=True, exist_ok=True)
    (evidence_root / "completed.json").write_text(
        json.dumps({"status": "completed", "resolution": value}) + "\n",
        encoding="utf-8",
    )
    status.set(f"Completed: {value}")
    root.update_idletasks()


Button(root, text="Complete", command=complete).pack()
resolution.focus_force()
root.after(100, resolution.focus_force)
signal.signal(signal.SIGTERM, lambda *_args: root.after(0, root.destroy))
root.mainloop()
