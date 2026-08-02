"""Play a completion chime sound to notify the user."""
import winsound
import time

# Play a pleasant ascending two-tone chime
winsound.Beep(800, 200)
time.sleep(0.05)
winsound.Beep(1200, 300)
print("[CHIME] Notification complete.")
