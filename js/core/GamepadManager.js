export class GamepadManager {
    constructor(game) {
        this.game = game;
        this.gamepads = {};
        this.activeGamepadIndex = null;
        this.buttonsState = {}; // Previous state to detect press vs hold
        
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            this.activeGamepadIndex = e.gamepad.index;
            this.game.createOverlay('GAMEPAD DETECTED', [{ text: 'OK', action: () => this.game.removeOverlay() }]);
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            if (this.activeGamepadIndex === e.gamepad.index) {
                this.activeGamepadIndex = null;
            }
        });
    }

    update() {
        if (this.activeGamepadIndex === null) return;
        
        const gp = navigator.getGamepads()[this.activeGamepadIndex];
        if (!gp) return;

        // Standard Mapping (Xbox/DualShock style)
        // 0: A/Cross, 1: B/Circle, 2: X/Square, 3: Y/Triangle
        // 12: Dpad Up, 13: Dpad Down, 14: Dpad Left, 15: Dpad Right
        
        const mapping = {
            0: 'KeyJ', // A -> Lane 2
            1: 'KeyK', // B -> Lane 3
            2: 'KeyD', // X -> Lane 0
            3: 'KeyF', // Y -> Lane 1
            14: 'KeyD', // Left -> Lane 0
            12: 'KeyF', // Up -> Lane 1
            13: 'KeyJ', // Down -> Lane 2
            15: 'KeyK'  // Right -> Lane 3
        };

        for (const [btnIdx, key] of Object.entries(mapping)) {
            const btn = gp.buttons[btnIdx];
            const pressed = btn ? btn.pressed : false;
            const wasPressed = this.buttonsState[btnIdx] || false;

            if (pressed && !wasPressed) {
                // Simulate Key Down
                window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
                this.vibrate(10, 0.2, 0.2); // Light haptic feedback on press
            } else if (!pressed && wasPressed) {
                // Simulate Key Up
                window.dispatchEvent(new KeyboardEvent('keyup', { code: key }));
            }
            
            this.buttonsState[btnIdx] = pressed;
        }
    }

    vibrate(duration, weak = 1.0, strong = 1.0) {
        if (this.activeGamepadIndex === null) return;
        const gp = navigator.getGamepads()[this.activeGamepadIndex];
        if (gp && gp.vibrationActuator) {
            gp.vibrationActuator.playEffect("dual-rumble", {
                startDelay: 0,
                duration: duration,
                weakMagnitude: weak,
                strongMagnitude: strong
            });
        }
    }
}
