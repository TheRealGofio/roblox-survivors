import { SoundService, Workspace } from "@rbxts/services";

export namespace SoundManager {
	// Catálogo de SFX con IDs de Roblox oficiales / abiertos
	const SFX_IDS = {
		gemPickup: "rbxassetid://9069609204", // Tintineo agudo de EXP / Gema
		levelUp: "rbxassetid://9069609204",   // Campana de subida de nivel
		playerHit: "rbxassetid://9114223171", // Golpe sordo recibido
		dash: "rbxassetid://9114221580",      // Whoosh de aire supersónico
		laserShoot: "rbxassetid://9114221160",// Disparo de plasma bláster
		enemyHit: "rbxassetid://9114223171",  // Impacto en enemigo
		gameOver: "rbxassetid://9069609204",  // Fin de partida
	};

	let soundFolder = SoundService.FindFirstChild("GameSounds") as Folder;
	if (!soundFolder) {
		soundFolder = new Instance("Folder");
		soundFolder.Name = "GameSounds";
		soundFolder.Parent = SoundService;
	}

	export function playSound(soundKey: keyof typeof SFX_IDS, volume = 0.5, playbackSpeed = 1.0) {
		const assetId = SFX_IDS[soundKey];
		if (!assetId) return;

		const sound = new Instance("Sound");
		sound.SoundId = assetId;
		sound.Volume = volume;
		sound.PlaybackSpeed = playbackSpeed;
		sound.RollOffMaxDistance = 100;
		sound.Parent = soundFolder;

		sound.Play();
		sound.Ended.Connect(() => {
			sound.Destroy();
		});

		// Seguridad de limpieza
		task.delay(4, () => {
			if (sound && sound.Parent) sound.Destroy();
		});
	}

	export function playHitSound(pitchVariance = true) {
		const pitch = pitchVariance ? 0.9 + math.random() * 0.25 : 1.0;
		playSound("enemyHit", 0.35, pitch);
	}

	export function playGemSound() {
		playSound("gemPickup", 0.45, 1.2 + math.random() * 0.2);
	}

	export function playDashSound() {
		playSound("dash", 0.65, 1.1);
	}

	export function playLevelUpSound() {
		playSound("levelUp", 0.75, 0.9);
	}

	export function playLaserShootSound() {
		playSound("laserShoot", 0.3, 1.1 + math.random() * 0.15);
	}
}
