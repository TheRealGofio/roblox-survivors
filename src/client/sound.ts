import { SoundService, Workspace } from "@rbxts/services";

export namespace SoundManager {
	// 1. Sonidos nativos locales infalibles de Roblox (vienen preinstalados en el cliente de Roblox)
	// rbxasset://sounds/... nunca falla por permisos ni necesita descarga online
	const BUILTIN_SOUNDS = {
		gemPickup: "rbxasset://sounds/electronicpingshort.wav", // Campana / chime brillante
		levelUp: "rbxasset://sounds/victory.wav",               // Fanfarria
		playerHit: "rbxasset://sounds/ouch.wav",                // Daño clásico
		dash: "rbxasset://sounds/action_jump.mp3",              // Impulso rápido
		enemyHit: "rbxasset://sounds/hit.wav",                 // Impacto físico
		laserShoot: "rbxasset://sounds/button.wav",
	};

	let soundFolder = SoundService.FindFirstChild("GameSounds") as Folder;
	if (!soundFolder) {
		soundFolder = new Instance("Folder");
		soundFolder.Name = "GameSounds";
		soundFolder.Parent = SoundService;
	}

	export function playSound(soundKey: keyof typeof BUILTIN_SOUNDS, volume = 0.6, playbackSpeed = 1.0) {
		const assetUrl = BUILTIN_SOUNDS[soundKey];
		if (!assetUrl) return;

		const sound = new Instance("Sound");
		sound.SoundId = assetUrl;
		sound.Volume = volume;
		sound.PlaybackSpeed = playbackSpeed;
		sound.Parent = soundFolder;

		sound.Play();
		sound.Ended.Connect(() => {
			sound.Destroy();
		});

		task.delay(3, () => {
			if (sound && sound.Parent) sound.Destroy();
		});
	}

	export function playHitSound(pitchVariance = true) {
		const pitch = pitchVariance ? 1.0 + math.random() * 0.3 : 1.1;
		playSound("enemyHit", 0.5, pitch);
	}

	export function playGemSound() {
		playSound("gemPickup", 0.5, 1.4 + math.random() * 0.2);
	}

	export function playDashSound() {
		playSound("dash", 0.7, 1.2);
	}

	export function playLevelUpSound() {
		playSound("levelUp", 0.8, 1.0);
	}
}
