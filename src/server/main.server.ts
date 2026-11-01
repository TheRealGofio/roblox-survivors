import { Debris, Players, RunService, TweenService, Workspace } from "@rbxts/services";
import { ENEMY_TYPES, EnemyTypeConfig } from "shared/enemies";
import { WEAPONS } from "shared/weapons";
import { EnvironmentManager } from "./environment";

print("[r-survivors] Servidor inicializado con éxito.");

// Inicializar atmósfera e iluminación estilizada
EnvironmentManager.setupAtmosphere();
EnvironmentManager.buildArenaEnvironment();

// Estado global de juego y tiempo de partida
let isGamePaused = false;
let gameElapsedTime = 0;
let bossSpawned = false;

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

let bossAlertEvent = networkFolder.FindFirstChild("BossAlert") as RemoteEvent;
if (!bossAlertEvent) {
	bossAlertEvent = new Instance("RemoteEvent");
	bossAlertEvent.Name = "BossAlert";
	bossAlertEvent.Parent = networkFolder;
}

let debugActionEvent = networkFolder.FindFirstChild("DebugAction") as RemoteEvent;
if (!debugActionEvent) {
	debugActionEvent = new Instance("RemoteEvent");
	debugActionEvent.Name = "DebugAction";
	debugActionEvent.Parent = networkFolder;
}

let restartGameEvent = networkFolder.FindFirstChild("RestartGame") as RemoteEvent;
if (!restartGameEvent) {
	restartGameEvent = new Instance("RemoteEvent");
	restartGameEvent.Name = "RestartGame";
	restartGameEvent.Parent = networkFolder;
}

let zaWarudoEvent = networkFolder.FindFirstChild("ZaWarudo") as RemoteEvent;
if (!zaWarudoEvent) {
	zaWarudoEvent = new Instance("RemoteEvent");
	zaWarudoEvent.Name = "ZaWarudo";
	zaWarudoEvent.Parent = networkFolder;
}

// 4. Función generadora de Gemas (Cristales de EXP)
function spawnExpGem(position: Vector3, expValue = 10) {
	const gem = new Instance("Part");
	gem.Name = "ExpGem";
	gem.Shape = Enum.PartType.Ball;
	gem.Size = new Vector3(1.2, 1.2, 1.2);
	gem.Material = Enum.Material.Neon;

	if (expValue >= 100) {
		// Gema colosal del Boss
		gem.Size = new Vector3(3.0, 3.0, 3.0);
		gem.Color = new Color3(1.0, 0.2, 0.85); // Magenta cósmico épico
	} else if (expValue >= 30) {
		gem.Size = new Vector3(1.8, 1.8, 1.8);
		gem.Color = new Color3(0.95, 0.85, 0.1); // Dorado
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
	light.Range = expValue >= 100 ? 16 : 6;
	light.Brightness = 1.6;
	light.Parent = gem;

	Debris.AddItem(gem, 55);
}

// 5. Spawner de Ítems Especiales (Cofre de Suministros e Imán de Gemas)
function spawnMagnetItem(pos: Vector3) {
	const magnet = new Instance("Part");
	magnet.Name = "VacuumMagnet";
	magnet.Shape = Enum.PartType.Cylinder;
	magnet.Size = new Vector3(1.5, 2.2, 2.2);
	magnet.CFrame = new CFrame(pos.add(new Vector3(0, 1.2, 0))).mul(CFrame.Angles(0, 0, math.rad(90)));
	magnet.Color = new Color3(0.2, 0.8, 1.0); // Azul magnético
	magnet.Material = Enum.Material.Neon;
	magnet.Anchored = true;
	magnet.CanCollide = false;
	magnet.SetAttribute("IsSpecialDrop", "magnet");
	magnet.SetAttribute("Collected", false);
	magnet.Parent = dropsFolder;

	const light = new Instance("PointLight");
	light.Color = magnet.Color;
	light.Range = 12;
	light.Brightness = 2;
	light.Parent = magnet;

	Debris.AddItem(magnet, 40);
}

function spawnSupplyChest(pos: Vector3) {
	const chest = new Instance("Part");
	chest.Name = "SupplyChest";
	chest.Size = new Vector3(2.8, 2.2, 2.2);
	chest.Position = pos.add(new Vector3(0, 1.1, 0));
	chest.Color = new Color3(1.0, 0.75, 0.1); // Cofre dorado
	chest.Material = Enum.Material.Neon;
	chest.Anchored = true;
	chest.CanCollide = false;
	chest.SetAttribute("IsSpecialDrop", "chest");
	chest.SetAttribute("Collected", false);
	chest.Parent = dropsFolder;

	const light = new Instance("PointLight");
	light.Color = chest.Color;
	light.Range = 14;
	light.Brightness = 2.5;
	light.Parent = chest;

	Debris.AddItem(chest, 50);
}

// Spawner periódico de Drops de Suministro (cada 35 segundos)
task.spawn(() => {
	while (true) {
		task.wait(35);
		if (isGamePaused) continue;

		const angle = math.random() * math.pi * 2;
		const dist = 15 + math.random() * 30;
		const dropPos = new Vector3(math.cos(angle) * dist, 0, math.sin(angle) * dist);

		if (math.random() < 0.5) {
			spawnMagnetItem(dropPos);
		} else {
			spawnSupplyChest(dropPos);
		}
	}
});

// 6. Manejo del daño a enemigos recibido desde el cliente
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
			const isBoss = enemy.GetAttribute("Behavior") === "boss";
			const isTank = enemy.GetAttribute("Behavior") === "tank";
			// Los jefes son inamovibles (inmunes a knockback), los tanques tienen alta resistencia
			const knockbackForce = isBoss ? 0 : isTank ? 5 : 18;
			if (bodyVel && knockbackForce > 0) {
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
			const isBoss = enemy.GetAttribute("Behavior") === "boss";

			// Si muere el Boss, genera el gran cofre + gema cósmica
			if (isBoss) {
				spawnSupplyChest(deathPos);
				spawnExpGem(deathPos.add(new Vector3(2, 0, 0)), 150);
				spawnMagnetItem(deathPos.add(new Vector3(-2, 0, 0)));
			} else {
				spawnExpGem(deathPos, xpReward);
			}

			enemy.CanCollide = false;
			TweenService.Create(enemy, new TweenInfo(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size: new Vector3(0.1, 0.1, 0.1),
				Transparency: 1,
			}).Play();

			task.delay(0.2, () => {
				enemy.Destroy();
			});
		}
	}
});

// 7. Manejo de recolección de gemas, cofres e imán
collectGemEvent.OnServerEvent.Connect((player, itemArg) => {
	if (isGamePaused) return;

	const item = itemArg as Instance;
	if (item && item.IsDescendantOf(dropsFolder) && item.IsA("BasePart")) {
		const specialType = item.GetAttribute("IsSpecialDrop") as string | undefined;

		// Efecto Imán / Vórtice
		if (specialType === "magnet") {
			item.Destroy();
			const char = player.Character;
			const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
			if (hrp) {
				// Atraer instantáneamente todas las gemas del mapa hacia el jugador
				for (const gem of dropsFolder.GetChildren()) {
					if (gem.IsA("BasePart") && gem.GetAttribute("ExpValue") !== undefined) {
						gem.Position = hrp.Position;
					}
				}
			}
			return;
		}

		// Efecto Cofre de Suministros (Nivel gratis directo)
		if (specialType === "chest") {
			item.Destroy();
			const leaderstats = player.FindFirstChild("leaderstats") as Folder;
			if (leaderstats) {
				const levelStat = leaderstats.FindFirstChild("Level") as IntValue;
				if (levelStat) {
					levelStat.Value += 1;
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
			return;
		}

		// Gema normal
		const exp = (item.GetAttribute("ExpValue") as number) ?? 10;
		item.Destroy();

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

// 8. Configuración de estadísticas y estado inicial del jugador
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

	const orbitsLvl = new Instance("IntValue");
	orbitsLvl.Name = "chrono_orbits";
	orbitsLvl.Value = 0;
	orbitsLvl.Parent = inventory;

	const novaLvl = new Instance("IntValue");
	novaLvl.Name = "nova_beam";
	novaLvl.Value = 0; // Desbloqueable en Level Up
	novaLvl.Parent = inventory;

	const maxHpBonus = new Instance("NumberValue");
	maxHpBonus.Name = "max_hp_bonus";
	maxHpBonus.Value = 0;
	maxHpBonus.Parent = inventory;

	const moveSpeedBonus = new Instance("NumberValue");
	moveSpeedBonus.Name = "speed_bonus";
	moveSpeedBonus.Value = 0;
	moveSpeedBonus.Parent = inventory;
});

// 9. Manejo de elección de mejoras y REANUDACIÓN
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
		} else if (upgradeId === "chrono_orbits") {
			const val = inventory.FindFirstChild("chrono_orbits") as IntValue;
			if (val) {
				val.Value += 1;
				print(`[Upgrade] ${player.Name} mejoró/desbloqueó Órbitas Crono a Nivel ${val.Value}`);
			}
		} else if (upgradeId === "nova_beam") {
			const val = inventory.FindFirstChild("nova_beam") as IntValue;
			if (val) {
				val.Value += 1;
				print(`[Upgrade] ${player.Name} mejoró/desbloqueó Rayo Nova a Nivel ${val.Value}`);
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

// Manejo de acciones del Debug Panel
debugActionEvent.OnServerEvent.Connect((player, actionArg) => {
	const action = actionArg as string;
	const char = player.Character;
	const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;

	if (action === "instant_level_up") {
		const leaderstats = player.FindFirstChild("leaderstats") as Folder;
		const lvlStat = leaderstats?.FindFirstChild("Level") as IntValue;
		if (lvlStat) {
			lvlStat.Value += 1;
			isGamePaused = true;
			for (const enemy of enemiesFolder.GetChildren()) {
				if (enemy.IsA("BasePart")) {
					const vel = enemy.FindFirstChildOfClass("BodyVelocity");
					if (vel) vel.Velocity = new Vector3(0, 0, 0);
				}
			}
			levelUpEvent.FireClient(player, lvlStat.Value);
		}
	} else if (action === "spawn_boss") {
		bossAlertEvent.FireAllClients("¡BOSS INVOCADO POR DEBUG!");
		const bossPart = createEnemyInstance(ENEMY_TYPES.overlord_boss, 9999);
		if (hrp) {
			bossPart.Position = hrp.Position.add(new Vector3(0, 4, 25));
		}
	} else if (action === "spawn_chest") {
		if (hrp) spawnSupplyChest(hrp.Position.add(new Vector3(4, 0, 4)));
	} else if (action === "spawn_magnet") {
		if (hrp) spawnMagnetItem(hrp.Position.add(new Vector3(-4, 0, 4)));
	} else if (action === "kill_all_enemies") {
		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart")) {
				spawnExpGem(enemy.Position, 15);
				enemy.Destroy();
			}
		}
	} else if (action === "heal_player") {
		const hum = char?.FindFirstChildOfClass("Humanoid");
		if (hum) hum.Health = hum.MaxHealth;
	} else if (action === "add_time") {
		gameElapsedTime += 60;
		print(`[Debug] Tiempo adelantado a ${gameElapsedTime}s`);
	} else if (action === "unlock_all_weapons") {
		const inventory = player.FindFirstChild("Inventory") as Folder;
		if (inventory) {
			const b = inventory.FindFirstChild("void_boomerang") as IntValue;
			if (b) b.Value = 3;
			const p = inventory.FindFirstChild("plasma_blaster") as IntValue;
			if (p) p.Value = 2;
			const o = inventory.FindFirstChild("chrono_orbits") as IntValue;
			if (o) o.Value = 3;
			const n = inventory.FindFirstChild("nova_beam") as IntValue;
			if (n) n.Value = 3;
			print(`[Debug] ${player.Name} ha desbloqueado todas las armas a nivel máximo`);
		}
	} else if (action === "give_plasma") {
		const inventory = player.FindFirstChild("Inventory") as Folder;
		const p = inventory?.FindFirstChild("plasma_blaster") as IntValue;
		if (p) p.Value = math.min(2, p.Value + 1);
	} else if (action === "give_orbits") {
		const inventory = player.FindFirstChild("Inventory") as Folder;
		const o = inventory?.FindFirstChild("chrono_orbits") as IntValue;
		if (o) o.Value = math.min(3, o.Value + 1);
	} else if (action === "give_nova") {
		const inventory = player.FindFirstChild("Inventory") as Folder;
		const n = inventory?.FindFirstChild("nova_beam") as IntValue;
		if (n) n.Value = math.min(3, n.Value + 1);
	} else if (action === "give_speed") {
		const hum = char?.FindFirstChildOfClass("Humanoid");
		if (hum) hum.WalkSpeed += 6;
	} else if (action === "trigger_zawarudo") {
		triggerZaWarudo(player);
	}
});

// Función central de Za Warudo (Estasis Temporal)
let isZaWarudoActive = false;
function triggerZaWarudo(player: Player) {
	if (isZaWarudoActive || isGamePaused) return;
	isZaWarudoActive = true;
	print(`[ZA WARUDO] Activado por ${player.Name}! Tiempo congelado durante 4.0s`);

	// Notificar a todos los clientes para efectos de pantalla y audio
	zaWarudoEvent.FireAllClients(4.0);

	// Congelar velocidades de todos los enemigos y proyectiles
	for (const enemy of enemiesFolder.GetChildren()) {
		if (enemy.IsA("BasePart")) {
			const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
			if (bodyVel) bodyVel.Velocity = new Vector3(0, 0, 0);
		}
	}
	for (const proj of enemyProjectilesFolder.GetChildren()) {
		if (proj.IsA("BasePart")) {
			const bodyVel = proj.FindFirstChildOfClass("BodyVelocity");
			if (bodyVel) bodyVel.Velocity = new Vector3(0, 0, 0);
		}
	}

	task.delay(4.0, () => {
		isZaWarudoActive = false;
		print("[ZA WARUDO] El tiempo vuelve a fluir...");
	});
}

// Escuchar activación manual de Za Warudo desde el cliente
zaWarudoEvent.OnServerEvent.Connect((player) => {
	triggerZaWarudo(player);
});

// Manejo de reinicio completo de partida
restartGameEvent.OnServerEvent.Connect((player) => {
	print(`[r-survivors] Reiniciando partida por completo para ${player.Name}...`);

	// 1. Limpiar todos los enemigos activos
	for (const enemy of enemiesFolder.GetChildren()) {
		enemy.Destroy();
	}

	// 2. Limpiar todos los proyectiles enemigos
	for (const proj of enemyProjectilesFolder.GetChildren()) {
		proj.Destroy();
	}

	// 3. Limpiar todas las gemas y drops del mapa
	for (const drop of dropsFolder.GetChildren()) {
		drop.Destroy();
	}

	// 4. Resetear tiempo de juego y banderas
	gameElapsedTime = 0;
	bossSpawned = false;
	isGamePaused = false;

	// 5. Resetear stats e inventario del jugador
	const leaderstats = player.FindFirstChild("leaderstats") as Folder;
	if (leaderstats) {
		const lvl = leaderstats.FindFirstChild("Level") as IntValue;
		if (lvl) lvl.Value = 1;
		const exp = leaderstats.FindFirstChild("EXP") as NumberValue;
		if (exp) exp.Value = 0;
	}

	const inventory = player.FindFirstChild("Inventory") as Folder;
	if (inventory) {
		const b = inventory.FindFirstChild("void_boomerang") as IntValue;
		if (b) b.Value = 1;
		const p = inventory.FindFirstChild("plasma_blaster") as IntValue;
		if (p) p.Value = 0;
		const o = inventory.FindFirstChild("chrono_orbits") as IntValue;
		if (o) o.Value = 0;
		const n = inventory.FindFirstChild("nova_beam") as IntValue;
		if (n) n.Value = 0;
		const sp = inventory.FindFirstChild("speed_bonus") as NumberValue;
		if (sp) sp.Value = 0;
		const hp = inventory.FindFirstChild("max_hp_bonus") as NumberValue;
		if (hp) hp.Value = 0;
	}

	// 6. Restaurar personaje
	const char = player.Character;
	const hum = char?.FindFirstChildOfClass("Humanoid");
	if (hum) {
		hum.MaxHealth = 100;
		hum.Health = 100;
		hum.WalkSpeed = 16;
	}

	const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (hrp) {
		hrp.CFrame = new CFrame(0, 3, 0);
	}
});

// 10. Función para crear cualquier enemigo de ENEMY_TYPES
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

// 11. Spawner inteligente con escalado de oleadas y BOSS EVENT
task.spawn(() => {
	let enemyIndex = 0;
	while (true) {
		task.wait(1.5);
		if (isGamePaused) continue;

		gameElapsedTime += 1.5;

		// BOSS EVENT: Minuto 3 (180 segundos)
		if (gameElapsedTime >= 180 && !bossSpawned) {
			bossSpawned = true;
			print("[BOSS EVENT] ¡El Señor del Vacío ha despertado!");
			bossAlertEvent.FireAllClients("¡SEÑOR DEL VACÍO HA DESPERTADO!");

			const bossPart = createEnemyInstance(ENEMY_TYPES.overlord_boss, 999);
			bossPart.Position = new Vector3(0, 4.5, 60); // Spawnea cerca de la arena
		}

		const currentCount = enemiesFolder.GetChildren().size();
		const maxCapacity = math.min(50, 20 + math.floor(gameElapsedTime / 20) * 5);

		if (currentCount < maxCapacity) {
			enemyIndex++;

			let chosenConfig = ENEMY_TYPES.crawler;
			const roll = math.random();

			if (gameElapsedTime > 60 && roll < 0.15) {
				chosenConfig = ENEMY_TYPES.brute;
			} else if (gameElapsedTime > 35 && roll < 0.35) {
				chosenConfig = ENEMY_TYPES.turret;
			} else if (gameElapsedTime > 15 && roll < 0.6) {
				chosenConfig = ENEMY_TYPES.skimmer;
			} else {
				chosenConfig = ENEMY_TYPES.crawler;
			}

			createEnemyInstance(chosenConfig, enemyIndex);
		}
	}
});

// 12. IA de comportamiento por arquetipo (Melee, Fast, Tank, Shooter, Boss)
RunService.Heartbeat.Connect(() => {
	if (isGamePaused || isZaWarudoActive) {
		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart")) {
				const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
				if (bodyVel) bodyVel.Velocity = new Vector3(0, 0, 0);
			}
		}
		for (const proj of enemyProjectilesFolder.GetChildren()) {
			if (proj.IsA("BasePart")) {
				const bodyVel = proj.FindFirstChildOfClass("BodyVelocity");
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

			let closestDist = 99999;
			let targetPos: Vector3 | undefined = undefined;

			for (const p of allPlayers) {
				const char = p.Character;
				const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
				const hum = char?.FindFirstChildOfClass("Humanoid");
				if (hrp && hum && hum.Health > 0) {
					const dist = hrp.Position.sub(enemy.Position).Magnitude;
					if (dist < closestDist) {
						closestDist = dist;
						targetPos = hrp.Position;
					}
				}
			}

			if (targetPos) {
				const dir = targetPos.sub(enemy.Position);
				const dirHorizontal = new Vector3(dir.X, 0, dir.Z).Unit;

				if (behavior === "boss") {
					// BOSS: Marcha imparable hacia el jugador + ráfaga de 3 proyectiles
					bodyVel.Velocity = dirHorizontal.mul(baseSpeed);

					const lastShot = (enemy.GetAttribute("LastShotTime") as number) ?? 0;
					if (currentTime - lastShot >= 2.5) {
						enemy.SetAttribute("LastShotTime", currentTime);
						// Ráfaga en trío
						fireEnemyProjectile(enemy.Position, targetPos, 18);
						task.delay(0.2, () => fireEnemyProjectile(enemy.Position, targetPos.add(new Vector3(4, 0, 4)), 18));
						task.delay(0.4, () => fireEnemyProjectile(enemy.Position, targetPos.add(new Vector3(-4, 0, -4)), 18));
					}
				} else if (behavior === "shooter") {
					if (closestDist < 18) {
						bodyVel.Velocity = dirHorizontal.mul(-baseSpeed * 0.8);
					} else if (closestDist > 28) {
						bodyVel.Velocity = dirHorizontal.mul(baseSpeed);
					} else {
						const perpDir = new Vector3(-dirHorizontal.Z, 0, dirHorizontal.X);
						bodyVel.Velocity = perpDir.mul(baseSpeed * 0.6);
					}

					const lastShot = (enemy.GetAttribute("LastShotTime") as number) ?? 0;
					if (currentTime - lastShot >= 3.0) {
						enemy.SetAttribute("LastShotTime", currentTime);
						fireEnemyProjectile(enemy.Position, targetPos, 14);
					}
				} else {
					bodyVel.Velocity = dirHorizontal.mul(baseSpeed);
				}
			} else {
				const dirToCenter = new Vector3(0, 0, 0).sub(enemy.Position).Unit;
				bodyVel.Velocity = new Vector3(dirToCenter.X * 5, 0, dirToCenter.Z * 5);
			}
		}
	}
});

// 13. Proyectiles hostiles de los Centinelas y Boss
function fireEnemyProjectile(startPos: Vector3, targetPos: Vector3, damage: number) {
	const proj = new Instance("Part");
	proj.Name = "EnemyOrb";
	proj.Shape = Enum.PartType.Ball;
	proj.Size = new Vector3(1.4, 1.4, 1.4);
	proj.Color = new Color3(1.0, 0.15, 0.2); // Rojo cósmico
	proj.Material = Enum.Material.Neon;
	proj.CanCollide = false;
	proj.Anchored = false;
	proj.Position = startPos.add(new Vector3(0, 2.0, 0));
	proj.Parent = enemyProjectilesFolder;

	const light = new Instance("PointLight");
	light.Color = proj.Color;
	light.Range = 8;
	light.Brightness = 2;
	light.Parent = proj;

	const dir = targetPos.sub(proj.Position).Unit;
	const bodyVel = new Instance("BodyVelocity");
	bodyVel.MaxForce = new Vector3(10000, 10000, 10000);
	bodyVel.Velocity = dir.mul(28);
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
