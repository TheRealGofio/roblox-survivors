import { Debris, Players, RunService, TweenService, Workspace } from "@rbxts/services";
import { WEAPONS } from "shared/weapons";

print("[r-survivors] Servidor inicializado con éxito.");
print(`[r-survivors] Armas registradas: ${WEAPONS.void_boomerang.name}, ${WEAPONS.plasma_blaster.name}`);

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
	baseplate.Color = new Color3(0.18, 0.22, 0.28); // Gris azulado oscuro cyberpunk
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

// 3. RemoteEvents para Daño y Recogida
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

// 4. Función generadora de Gemas (Cristales de EXP)
function spawnExpGem(position: Vector3, expValue = 10) {
	const gem = new Instance("Part");
	gem.Name = "ExpGem";
	gem.Shape = Enum.PartType.Ball;
	gem.Size = new Vector3(1.2, 1.2, 1.2);
	gem.Material = Enum.Material.Neon;
	gem.Color = new Color3(0.2, 0.9, 0.35); // Verde esmeralda brillante
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
	const enemy = enemyArg as Instance;
	const damage = typeOf(damageArg) === "number" ? (damageArg as number) : 10;
	const knockbackDir = knockbackDirArg as Vector3 | undefined;

	if (enemy && enemy.IsDescendantOf(enemiesFolder) && enemy.IsA("BasePart")) {
		const currentHp = (enemy.GetAttribute("HP") as number) ?? 40;
		const newHp = math.max(0, currentHp - damage);
		enemy.SetAttribute("HP", newHp);

		// Retroceso físico breve (knockback)
		if (knockbackDir) {
			const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
			if (bodyVel) {
				bodyVel.Velocity = knockbackDir.mul(18).add(new Vector3(0, 4, 0));
				enemy.SetAttribute("InKnockback", true);
				task.delay(0.25, () => {
					if (enemy && enemy.Parent) {
						enemy.SetAttribute("InKnockback", false);
					}
				});
			}
		}

		// Comprobar muerte del enemigo
		if (newHp <= 0) {
			const deathPos = enemy.Position;
			spawnExpGem(deathPos, 15);

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
				// Cada nivel requiere: nivel * 50 exp
				const nextLevelReq = levelStat.Value * 50;
				if (expStat.Value >= nextLevelReq) {
					expStat.Value -= nextLevelReq;
					levelStat.Value += 1;
					print(`[r-survivors] ¡${player.Name} ha subido al Nivel ${levelStat.Value}!`);
				}
			}
		}
	}
});

// 7. Configuración de estadísticas de jugador (leaderstats)
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
});

// 8. Spawner continuo de enemigos (Crawler)
task.spawn(() => {
	let enemyCount = 0;
	while (true) {
		task.wait(2.0);
		if (enemiesFolder.GetChildren().size() < 30) {
			enemyCount++;
			const dummy = new Instance("Part");
			dummy.Name = `Crawler_${enemyCount}`;
			dummy.Size = new Vector3(3, 3, 3);
			dummy.Color = new Color3(0.95, 0.25, 0.2); // Rojo neón agresivo
			dummy.Material = Enum.Material.Neon;
			dummy.Anchored = false;
			dummy.CanCollide = true;

			// Generar en círculo exterior alrededor de la arena
			const angle = math.random() * math.pi * 2;
			const dist = 40 + math.random() * 20;
			dummy.Position = new Vector3(math.cos(angle) * dist, 3, math.sin(angle) * dist);
			dummy.SetAttribute("HP", 40);
			dummy.SetAttribute("MaxHP", 40);
			dummy.SetAttribute("InKnockback", false);
			dummy.Parent = enemiesFolder;

			const bodyVelocity = new Instance("BodyVelocity");
			bodyVelocity.MaxForce = new Vector3(5000, 0, 5000);
			bodyVelocity.Velocity = new Vector3(0, 0, 0);
			bodyVelocity.Parent = dummy;

			// Daño al jugador por contacto con cooldown de invulnerabilidad
			let lastPlayerDamageTime = 0;
			dummy.Touched.Connect((hitPart) => {
				const char = hitPart.Parent;
				const hum = char?.FindFirstChildOfClass("Humanoid");
				if (hum && hum.Health > 0) {
					const now = os.clock();
					if (now - lastPlayerDamageTime >= 0.8) {
						lastPlayerDamageTime = now;
						hum.TakeDamage(10); // 10 puntos de daño al jugador
					}
				}
			});
		}
	}
});

// 9. IA Activa de los enemigos: persegir al jugador vivo más cercano
RunService.Heartbeat.Connect(() => {
	const allPlayers = Players.GetPlayers();

	for (const enemy of enemiesFolder.GetChildren()) {
		if (enemy.IsA("BasePart") && enemy.GetAttribute("InKnockback") !== true) {
			const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
			if (!bodyVel) continue;

			// Buscar jugador más cercano
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
				const enemySpeed = 8.5; // Velocidad de persecución
				bodyVel.Velocity = dirHorizontal.mul(enemySpeed);
			} else {
				// Si no hay jugadores vivos, caminar al centro
				const dirToCenter = new Vector3(0, 0, 0).sub(enemy.Position).Unit;
				bodyVel.Velocity = new Vector3(dirToCenter.X * 5, 0, dirToCenter.Z * 5);
			}
		}
	}
});
