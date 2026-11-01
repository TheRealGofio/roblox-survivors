import { Debris, Players, RunService, TweenService, Workspace } from "@rbxts/services";
import { ENEMY_TYPES, EnemyTypeConfig } from "shared/enemies";
import { WEAPONS } from "shared/weapons";

print("[r-survivors] Servidor inicializado con éxito.");

// Estado global de juego y tiempo de partida
let isGamePaused = false;
let gameElapsedTime = 0;

// 1. Crear el suelo de la arena física (Baseplate) si no existe
let baseplate = Workspace.FindFirstChild("Baseplate") as BasePart;
if (!baseplate) {
	baseplate = new Instance("Part");
	baseplate.Name = "Baseplate";
	baseplate.Size = new Vector3(500, 4, 500);
	baseplate.Position = new Vector3(0, -2, 0);
	baseplate.Anchored = true;
	baseplate.CanCollide = true;
	baseplate.Material = Enum.Material.Concrete;
	baseplate.Color = new Color3(0.18, 0.22, 0.28);
	baseplate.Parent = Workspace;

	const spawn = new Instance("SpawnLocation");
	spawn.Name = "SpawnLocation";
	spawn.Size = new Vector3(12, 1, 12);
	spawn.Position = new Vector3(0, 0.5, 0);
	spawn.Anchored = true;
	spawn.CanCollide = true;
	spawn.Neutral = true;
	spawn.Material = Enum.Material.Neon;
	spawn.Color = new Color3(0.1, 0.6, 0.9);
	spawn.Parent = Workspace;
}

// 2. Folders organizativos en Workspace
let enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
if (!enemiesFolder) {
	enemiesFolder = new Instance("Folder");
	enemiesFolder.Name = "Enemies";
	enemiesFolder.Parent = Workspace;
}

let enemyProjectilesFolder = Workspace.FindFirstChild("EnemyProjectiles") as Folder;
if (!enemyProjectilesFolder) {
	enemyProjectilesFolder = new Instance("Folder");
	enemyProjectilesFolder.Name = "EnemyProjectiles";
	enemyProjectilesFolder.Parent = Workspace;
}

let dropsFolder = Workspace.FindFirstChild("Drops") as Folder;
if (!dropsFolder) {
	dropsFolder = new Instance("Folder");
	dropsFolder.Name = "Drops";
	dropsFolder.Parent = Workspace;
}

let networkFolder = Workspace.FindFirstChild("Network") as Folder;
if (!networkFolder) {
	networkFolder = new Instance("Folder");
	networkFolder.Name = "Network";
	networkFolder.Parent = Workspace;
}

// 3. RemoteEvents para Red
let damageEnemyEvent = networkFolder.FindFirstChild("DamageEnemy") as RemoteEvent;
if (!damageEnemyEvent) {
	damageEnemyEvent = new Instance("RemoteEvent");
	damageEnemyEvent.Name = "DamageEnemy";
	damageEnemyEvent.Parent = networkFolder;
}

let collectGemEvent = networkFolder.FindFirstChild("CollectGem") as RemoteEvent;
if (!collectGemEvent) {
	collectGemEvent = new Instance("RemoteEvent");
	collectGemEvent.Name = "CollectGem";
	collectGemEvent.Parent = networkFolder;
}

let levelUpEvent = networkFolder.FindFirstChild("LevelUp") as RemoteEvent;
if (!levelUpEvent) {
	levelUpEvent = new Instance("RemoteEvent");
	levelUpEvent.Name = "LevelUp";
	levelUpEvent.Parent = networkFolder;
}

let selectUpgradeEvent = networkFolder.FindFirstChild("SelectUpgrade") as RemoteEvent;
if (!selectUpgradeEvent) {
	selectUpgradeEvent = new Instance("RemoteEvent");
	selectUpgradeEvent.Name = "SelectUpgrade";
	selectUpgradeEvent.Parent = networkFolder;
}

// 4. Función generadora de Gemas (Cristales de EXP)
function spawnExpGem(position: Vector3, expValue = 10) {
	const gem = new Instance("Part");
	gem.Name = "ExpGem";
	gem.Shape = Enum.PartType.Ball;
	gem.Size = new Vector3(1.2, 1.2, 1.2);
	gem.Material = Enum.Material.Neon;
	// Gemas grandes para los tanques
	if (expValue >= 30) {
		gem.Size = new Vector3(1.8, 1.8, 1.8);
		gem.Color = new Color3(0.95, 0.85, 0.1); // Dorado para experiencia valiosa
	} else {
		gem.Color = new Color3(0.2, 0.9, 0.35); // Verde esmeralda
	}
	gem.CanCollide = false;
	gem.Anchored = true;
	gem.Position = position.add(new Vector3(0, 0.6, 0));
	gem.SetAttribute("ExpValue", expValue);
	gem.SetAttribute("Collected", false);
	gem.Parent = dropsFolder;

	const light = new Instance("PointLight");
	light.Color = gem.Color;
	light.Range = 6;
	light.Brightness = 1.2;
	light.Parent = gem;

	Debris.AddItem(gem, 45);
}

// 5. Manejo del daño a enemigos recibido desde el cliente
damageEnemyEvent.OnServerEvent.Connect((player, enemyArg, damageArg, knockbackDirArg) => {
	if (isGamePaused) return;

	const enemy = enemyArg as Instance;
	const damage = typeOf(damageArg) === "number" ? (damageArg as number) : 10;
	const knockbackDir = knockbackDirArg as Vector3 | undefined;

	if (enemy && enemy.IsDescendantOf(enemiesFolder) && enemy.IsA("BasePart")) {
		const currentHp = (enemy.GetAttribute("HP") as number) ?? 40;
		const newHp = math.max(0, currentHp - damage);
		enemy.SetAttribute("HP", newHp);

		if (knockbackDir) {
			const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
			const isTank = enemy.GetAttribute("Behavior") === "tank";
			// Los brutos gigantes tienen gran resistencia al knockback
			const knockbackForce = isTank ? 5 : 18;
			if (bodyVel) {
				bodyVel.Velocity = knockbackDir.mul(knockbackForce).add(new Vector3(0, isTank ? 1 : 4, 0));
				enemy.SetAttribute("InKnockback", true);
				task.delay(0.22, () => {
					if (enemy && enemy.Parent) {
						enemy.SetAttribute("InKnockback", false);
					}
				});
			}
		}

		if (newHp <= 0) {
			const deathPos = enemy.Position;
			const xpReward = (enemy.GetAttribute("XpReward") as number) ?? 15;
			spawnExpGem(deathPos, xpReward);

			enemy.CanCollide = false;
			TweenService.Create(enemy, new TweenInfo(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size: new Vector3(0.1, 0.1, 0.1),
				Transparency: 1,
			}).Play();

			task.delay(0.18, () => {
				enemy.Destroy();
			});
		}
	}
});

// 6. Manejo de recolección de gemas y Level Up
collectGemEvent.OnServerEvent.Connect((player, gemArg) => {
	if (isGamePaused) return;

	const gem = gemArg as Instance;
	if (gem && gem.IsDescendantOf(dropsFolder) && gem.IsA("BasePart")) {
		const exp = (gem.GetAttribute("ExpValue") as number) ?? 10;
		gem.Destroy();

		const leaderstats = player.FindFirstChild("leaderstats") as Folder;
		if (leaderstats) {
			const expStat = leaderstats.FindFirstChild("EXP") as NumberValue;
			const levelStat = leaderstats.FindFirstChild("Level") as IntValue;
			if (expStat && levelStat) {
				expStat.Value += exp;
				const nextLevelReq = levelStat.Value * 50;
				if (expStat.Value >= nextLevelReq) {
					expStat.Value -= nextLevelReq;
					levelStat.Value += 1;
					print(`[r-survivors] ¡${player.Name} alcanzó el Nivel ${levelStat.Value}! Pausando juego...`);

					isGamePaused = true;
					for (const enemy of enemiesFolder.GetChildren()) {
						if (enemy.IsA("BasePart")) {
							const vel = enemy.FindFirstChildOfClass("BodyVelocity");
							if (vel) vel.Velocity = new Vector3(0, 0, 0);
						}
					}

					levelUpEvent.FireClient(player, levelStat.Value);
				}
			}
		}
	}
});

// 7. Configuración de estadísticas y estado inicial del jugador
Players.PlayerAdded.Connect((plr) => {
	const leaderstats = new Instance("Folder");
	leaderstats.Name = "leaderstats";
	leaderstats.Parent = plr;

	const level = new Instance("IntValue");
	level.Name = "Level";
	level.Value = 1;
	level.Parent = leaderstats;

	const exp = new Instance("NumberValue");
	exp.Name = "EXP";
	exp.Value = 0;
	exp.Parent = leaderstats;

	const inventory = new Instance("Folder");
	inventory.Name = "Inventory";
	inventory.Parent = plr;

	const boomerangLvl = new Instance("IntValue");
	boomerangLvl.Name = "void_boomerang";
	boomerangLvl.Value = 1;
	boomerangLvl.Parent = inventory;

	const plasmaLvl = new Instance("IntValue");
	plasmaLvl.Name = "plasma_blaster";
	plasmaLvl.Value = 0;
	plasmaLvl.Parent = inventory;

	const maxHpBonus = new Instance("NumberValue");
	maxHpBonus.Name = "max_hp_bonus";
	maxHpBonus.Value = 0;
	maxHpBonus.Parent = inventory;

	const moveSpeedBonus = new Instance("NumberValue");
	moveSpeedBonus.Name = "speed_bonus";
	moveSpeedBonus.Value = 0;
	moveSpeedBonus.Parent = inventory;
});

// 8. Manejo de elección de mejoras y REANUDACIÓN
selectUpgradeEvent.OnServerEvent.Connect((player, upgradeIdArg) => {
	const upgradeId = upgradeIdArg as string;
	const inventory = player.FindFirstChild("Inventory") as Folder;
	if (inventory) {
		if (upgradeId === "void_boomerang") {
			const val = inventory.FindFirstChild("void_boomerang") as IntValue;
			if (val) {
				val.Value += 1;
				print(`[Upgrade] ${player.Name} subió Búmeran a Nivel ${val.Value}`);
			}
		} else if (upgradeId === "plasma_blaster") {
			const val = inventory.FindFirstChild("plasma_blaster") as IntValue;
			if (val) {
				val.Value += 1;
				print(`[Upgrade] ${player.Name} mejoró/desbloqueó Bláster de Plasma a Nivel ${val.Value}`);
			}
		} else if (upgradeId === "speed_boost") {
			const val = inventory.FindFirstChild("speed_bonus") as NumberValue;
			if (val) {
				val.Value += 3;
				const hum = player.Character?.FindFirstChildOfClass("Humanoid");
				if (hum) hum.WalkSpeed += 3;
			}
		} else if (upgradeId === "max_hp") {
			const hum = player.Character?.FindFirstChildOfClass("Humanoid");
			if (hum) {
				hum.MaxHealth += 25;
				hum.Health += 25;
			}
		}
	}

	isGamePaused = false;
	print("[r-survivors] Juego reanudado.");
});

// 9. Función para crear cualquier enemigo de ENEMY_TYPES
function createEnemyInstance(config: EnemyTypeConfig, index: number): BasePart {
	const enemy = new Instance("Part");
	enemy.Name = `${config.name}_${index}`;
	enemy.Size = config.size;
	enemy.Color = config.color;
	enemy.Material = config.material;
	enemy.Anchored = false;
	enemy.CanCollide = true;

	const angle = math.random() * math.pi * 2;
	const dist = 42 + math.random() * 22;
	enemy.Position = new Vector3(math.cos(angle) * dist, config.size.Y / 2 + 1, math.sin(angle) * dist);

	enemy.SetAttribute("HP", config.hp);
	enemy.SetAttribute("MaxHP", config.hp);
	enemy.SetAttribute("Speed", config.speed);
	enemy.SetAttribute("Damage", config.damage);
	enemy.SetAttribute("XpReward", config.xpValue);
	enemy.SetAttribute("Behavior", config.behavior);
	enemy.SetAttribute("InKnockback", false);
	enemy.SetAttribute("LastShotTime", 0);
	enemy.Parent = enemiesFolder;

	const bodyVelocity = new Instance("BodyVelocity");
	// Fuerza proporcional a la masa para que los Goliat se muevan con soltura
	const massMultiplier = math.max(1, enemy.GetMass());
	bodyVelocity.MaxForce = new Vector3(massMultiplier * 200, 0, massMultiplier * 200);
	bodyVelocity.Velocity = new Vector3(0, 0, 0);
	bodyVelocity.Parent = enemy;

	let lastPlayerDamageTime = 0;
	enemy.Touched.Connect((hitPart) => {
		if (isGamePaused) return;

		const char = hitPart.Parent;
		const hum = char?.FindFirstChildOfClass("Humanoid");
		if (hum && hum.Health > 0) {
			const now = os.clock();
			if (now - lastPlayerDamageTime >= 0.8) {
				lastPlayerDamageTime = now;
				hum.TakeDamage(config.damage);
			}
		}
	});

	return enemy;
}

// 10. Spawner inteligente con escalado de oleadas
task.spawn(() => {
	let enemyIndex = 0;
	while (true) {
		task.wait(1.5);
		if (isGamePaused) continue;

		gameElapsedTime += 1.5;

		const currentCount = enemiesFolder.GetChildren().size();
		const maxCapacity = math.min(50, 20 + math.floor(gameElapsedTime / 20) * 5);

		if (currentCount < maxCapacity) {
			enemyIndex++;

			// Selección probabilística según tiempo de supervivencia
			let chosenConfig = ENEMY_TYPES.crawler;
			const roll = math.random();

			if (gameElapsedTime > 60 && roll < 0.15) {
				// Bruto Goliat (Tanque grande tras 1 minuto)
				chosenConfig = ENEMY_TYPES.brute;
			} else if (gameElapsedTime > 35 && roll < 0.35) {
				// Centinela Tirador
				chosenConfig = ENEMY_TYPES.turret;
			} else if (gameElapsedTime > 15 && roll < 0.6) {
				// Deslizador rápido
				chosenConfig = ENEMY_TYPES.skimmer;
			} else {
				// Crawler básico
				chosenConfig = ENEMY_TYPES.crawler;
			}

			createEnemyInstance(chosenConfig, enemyIndex);
		}
	}
});

// 11. IA de comportamiento por arquetipo (Melee, Fast, Tank, Shooter)
RunService.Heartbeat.Connect(() => {
	if (isGamePaused) {
		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart")) {
				const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
				if (bodyVel) bodyVel.Velocity = new Vector3(0, 0, 0);
			}
		}
		return;
	}

	const allPlayers = Players.GetPlayers();
	const currentTime = os.clock();

	for (const enemy of enemiesFolder.GetChildren()) {
		if (enemy.IsA("BasePart") && enemy.GetAttribute("InKnockback") !== true) {
			const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
			if (!bodyVel) continue;

			const behavior = enemy.GetAttribute("Behavior") as string;
			const baseSpeed = (enemy.GetAttribute("Speed") as number) ?? 8.0;

			// Encontrar jugador más cercano
			let closestDist = 99999;
			let targetPos: Vector3 | undefined = undefined;
			let targetPlayer: Player | undefined = undefined;

			for (const p of allPlayers) {
				const char = p.Character;
				const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
				const hum = char?.FindFirstChildOfClass("Humanoid");
				if (hrp && hum && hum.Health > 0) {
					const dist = hrp.Position.sub(enemy.Position).Magnitude;
					if (dist < closestDist) {
						closestDist = dist;
						targetPos = hrp.Position;
						targetPlayer = p;
					}
				}
			}

			if (targetPos) {
				const dir = targetPos.sub(enemy.Position);
				const dirHorizontal = new Vector3(dir.X, 0, dir.Z).Unit;

				// Comportamiento Shooter (Centinela)
				if (behavior === "shooter") {
					// Mantiene distancia óptima de disparo (20 a 28 studs)
					if (closestDist < 18) {
						// Retroceder si el jugador se acerca demasiado
						bodyVel.Velocity = dirHorizontal.mul(-baseSpeed * 0.8);
					} else if (closestDist > 28) {
						// Acercarse si está lejos
						bodyVel.Velocity = dirHorizontal.mul(baseSpeed);
					} else {
						// Orbitar lateralmente
						const perpDir = new Vector3(-dirHorizontal.Z, 0, dirHorizontal.X);
						bodyVel.Velocity = perpDir.mul(baseSpeed * 0.6);
					}

					// Disparar proyectil al jugador
					const lastShot = (enemy.GetAttribute("LastShotTime") as number) ?? 0;
					if (currentTime - lastShot >= 3.0) {
						enemy.SetAttribute("LastShotTime", currentTime);
						fireEnemyProjectile(enemy.Position, targetPos, 14);
					}
				} else {
					// Persecución directa (Melee, Fast, Tank)
					bodyVel.Velocity = dirHorizontal.mul(baseSpeed);
				}
			} else {
				// Sin objetivos vivos: ir al centro
				const dirToCenter = new Vector3(0, 0, 0).sub(enemy.Position).Unit;
				bodyVel.Velocity = new Vector3(dirToCenter.X * 5, 0, dirToCenter.Z * 5);
			}
		}
	}
});

// 12. Proyectiles hostiles de los Centinelas (Turret)
function fireEnemyProjectile(startPos: Vector3, targetPos: Vector3, damage: number) {
	const proj = new Instance("Part");
	proj.Name = "TurretOrb";
	proj.Shape = Enum.PartType.Ball;
	proj.Size = new Vector3(1.3, 1.3, 1.3);
	proj.Color = new Color3(0.05, 0.85, 1.0); // Cian eléctrico brillante
	proj.Material = Enum.Material.Neon;
	proj.CanCollide = false;
	proj.Anchored = false;
	proj.Position = startPos.add(new Vector3(0, 1.5, 0));
	proj.Parent = enemyProjectilesFolder;

	const light = new Instance("PointLight");
	light.Color = proj.Color;
	light.Range = 6;
	light.Brightness = 1.5;
	light.Parent = proj;

	const dir = targetPos.sub(proj.Position).Unit;
	const bodyVel = new Instance("BodyVelocity");
	bodyVel.MaxForce = new Vector3(8000, 8000, 8000);
	bodyVel.Velocity = dir.mul(26); // Velocidad del proyectil enemigo
	bodyVel.Parent = proj;

	let hit = false;
	proj.Touched.Connect((hitPart) => {
		if (hit) return;
		const char = hitPart.Parent;
		const hum = char?.FindFirstChildOfClass("Humanoid");
		if (hum && hum.Health > 0) {
			hit = true;
			hum.TakeDamage(damage);
			proj.Destroy();
		}
	});

	Debris.AddItem(proj, 4);
}
