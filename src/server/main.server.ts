import { Debris, Players, TweenService, Workspace } from "@rbxts/services";
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

	// Añadir un SpawnLocation encima del suelo
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
	gem.Shape = Enum.PartType.Ball; // o diamante estilizado
	gem.Size = new Vector3(1.2, 1.2, 1.2);
	gem.Material = Enum.Material.Neon;
	gem.Color = new Color3(0.2, 0.9, 0.35); // Verde esmeralda brillante
	gem.CanCollide = false;
	gem.Anchored = true;
	gem.Position = position.add(new Vector3(0, 0.6, 0));
	gem.SetAttribute("ExpValue", expValue);
	gem.SetAttribute("Collected", false);
	gem.Parent = dropsFolder;

	// Pequeña luz tenue para ambiente cyberpunk
	const light = new Instance("PointLight");
	light.Color = gem.Color;
	light.Range = 6;
	light.Brightness = 1.2;
	light.Parent = gem;

	// Despawn automático tras 40 segundos si no se recoge
	Debris.AddItem(gem, 40);
}

// 5. Manejo del daño recibido en el servidor
damageEnemyEvent.OnServerEvent.Connect((player, enemyArg, damageArg, knockbackDirArg) => {
	const enemy = enemyArg as Instance;
	const damage = typeOf(damageArg) === "number" ? (damageArg as number) : 10;
	const knockbackDir = knockbackDirArg as Vector3 | undefined;

	if (enemy && enemy.IsDescendantOf(enemiesFolder) && enemy.IsA("BasePart")) {
		const currentHp = (enemy.GetAttribute("HP") as number) ?? 40;
		const newHp = math.max(0, currentHp - damage);
		enemy.SetAttribute("HP", newHp);

		// Efecto de retroceso físico (knockback)
		if (knockbackDir) {
			const bodyVel = enemy.FindFirstChildOfClass("BodyVelocity");
			if (bodyVel) {
				bodyVel.Velocity = knockbackDir.mul(18).add(new Vector3(0, 4, 0));
				task.delay(0.18, () => {
					if (enemy && enemy.Parent && bodyVel.Parent) {
						// Reanudar marcha hacia el centro/jugador
						const dirToCenter = new Vector3(0, 0, 0).sub(enemy.Position).Unit;
						bodyVel.Velocity = new Vector3(dirToCenter.X * 7, 0, dirToCenter.Z * 7);
					}
				});
			}
		}

		// Comprobar muerte del enemigo
		if (newHp <= 0) {
			const deathPos = enemy.Position;
			// Soltar gema de experiencia
			spawnExpGem(deathPos, 15);

			// Efecto de muerte: encoger y destruir
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

// 6. Manejo de recolección de gemas en el servidor
collectGemEvent.OnServerEvent.Connect((player, gemArg) => {
	const gem = gemArg as Instance;
	if (gem && gem.IsDescendantOf(dropsFolder) && gem.IsA("BasePart")) {
		const exp = (gem.GetAttribute("ExpValue") as number) ?? 10;
		gem.Destroy();

		// Actualizar EXP y nivel del jugador
		const leaderstats = player.FindFirstChild("leaderstats") as Folder;
		if (leaderstats) {
			const expStat = leaderstats.FindFirstChild("EXP") as NumberValue;
			if (expStat) {
				expStat.Value += exp;
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

// 8. Spawner continuo de enemigos persiguiendo jugadores
task.spawn(() => {
	let enemyCount = 0;
	while (true) {
		task.wait(2.2);
		if (enemiesFolder.GetChildren().size() < 25) {
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
			dummy.Parent = enemiesFolder;

			// Movimiento hacia el centro
			const bodyVelocity = new Instance("BodyVelocity");
			bodyVelocity.MaxForce = new Vector3(4000, 0, 4000);
			bodyVelocity.Velocity = new Vector3(-math.cos(angle) * 7, 0, -math.sin(angle) * 7);
			bodyVelocity.Parent = dummy;
		}
	}
});
