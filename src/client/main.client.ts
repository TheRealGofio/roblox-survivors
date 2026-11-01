import { Debris, Players, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { WEAPONS } from "shared/weapons";
import { VisualEffects } from "./effects";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// Estado local de pausa y partida
let isClientPaused = false;
let isGameOver = false;
let startTime = os.clock();
let enemiesDefeatedCount = 0;

// Sistema de Dash Táctico (Espacio / Shift)
const DASH_COOLDOWN = 2.8;
let lastDashTime = -DASH_COOLDOWN;
let isDashing = false;

// 1. HUD de EXP, Nivel y Temporizador
const hudScreen = new Instance("ScreenGui");
hudScreen.Name = "SurvivorHUD";
hudScreen.ResetOnSpawn = false;
hudScreen.Parent = playerGui;

// Barra de EXP
const barBg = new Instance("Frame");
barBg.Name = "ExpBarBackground";
barBg.Size = new UDim2(0.55, 0, 0, 18);
barBg.Position = new UDim2(0.225, 0, 0.02, 0);
barBg.BackgroundColor3 = new Color3(0.1, 0.12, 0.15);
barBg.BorderSizePixel = 0;
barBg.Parent = hudScreen;

const uiCornerBg = new Instance("UICorner");
uiCornerBg.CornerRadius = new UDim(0, 6);
uiCornerBg.Parent = barBg;

const barFill = new Instance("Frame");
barFill.Name = "ExpBarFill";
barFill.Size = new UDim2(0, 0, 1, 0);
barFill.BackgroundColor3 = new Color3(0.2, 0.85, 0.35);
barFill.BorderSizePixel = 0;
barFill.Parent = barBg;

const uiCornerFill = new Instance("UICorner");
uiCornerFill.CornerRadius = new UDim(0, 6);
uiCornerFill.Parent = barFill;

const levelText = new Instance("TextLabel");
levelText.Name = "LevelText";
levelText.Size = new UDim2(1, 0, 1, 0);
levelText.BackgroundTransparency = 1;
levelText.Font = Enum.Font.FredokaOne;
levelText.Text = "LVL 1 - EXP: 0 / 50";
levelText.TextColor3 = new Color3(1, 1, 1);
levelText.TextSize = 13;
levelText.TextStrokeTransparency = 0.5;
levelText.Parent = barBg;

// Temporizador central en el HUD
const timerLabel = new Instance("TextLabel");
timerLabel.Name = "GameTimer";
timerLabel.Size = new UDim2(0, 120, 0, 30);
timerLabel.Position = new UDim2(0.5, -60, 0.05, 0);
timerLabel.BackgroundTransparency = 1;
timerLabel.Font = Enum.Font.FredokaOne;
timerLabel.Text = "00:00";
timerLabel.TextSize = 22;
timerLabel.TextColor3 = new Color3(1, 0.9, 0.4); // Amarillo suave
timerLabel.TextStrokeTransparency = 0.2;
timerLabel.Parent = hudScreen;

// Loop activo del temporizador
task.spawn(() => {
	while (true) {
		task.wait(1.0);
		if (!isGameOver && !isClientPaused) {
			const elapsed = math.floor(os.clock() - startTime);
			const mins = math.floor(elapsed / 60);
			const secs = elapsed % 60;
			const minStr = mins < 10 ? `0${mins}` : `${mins}`;
			const secStr = secs < 10 ? `0${secs}` : `${secs}`;
			timerLabel.Text = `${minStr}:${secStr}`;
		}
	}
});

// Indicador / Cooldown de Dash en HUD
const dashIndicator = new Instance("Frame");
dashIndicator.Name = "DashIndicator";
dashIndicator.Size = new UDim2(0, 130, 0, 24);
dashIndicator.Position = new UDim2(0.5, -65, 0.88, 0);
dashIndicator.BackgroundColor3 = new Color3(0.1, 0.12, 0.18);
dashIndicator.BorderSizePixel = 0;
dashIndicator.Parent = hudScreen;

const dashCorner = new Instance("UICorner");
dashCorner.CornerRadius = new UDim(0, 6);
dashCorner.Parent = dashIndicator;

const dashText = new Instance("TextLabel");
dashText.Name = "DashText";
dashText.Size = new UDim2(1, 0, 1, 0);
dashText.BackgroundTransparency = 1;
dashText.Font = Enum.Font.FredokaOne;
dashText.Text = "⚡ DASH [L-SHIFT]";
dashText.TextColor3 = new Color3(0.2, 0.9, 0.95);
dashText.TextSize = 13;
dashText.Parent = dashIndicator;

task.spawn(() => {
	while (true) {
		task.wait(0.1);
		const timeSinceDash = os.clock() - lastDashTime;
		if (timeSinceDash >= DASH_COOLDOWN) {
			dashText.Text = "⚡ DASH [L-SHIFT]";
			dashText.TextColor3 = new Color3(0.2, 0.9, 0.95);
		} else {
			const remaining = string.format("%.1f", math.max(0, DASH_COOLDOWN - timeSinceDash));
			dashText.Text = `⏳ ${remaining}s`;
			dashText.TextColor3 = new Color3(0.6, 0.6, 0.65);
		}
	}
});

// Función de activación de Dash
function triggerDash() {
	if (isClientPaused || isGameOver || isDashing) return;
	const now = os.clock();
	if (now - lastDashTime < DASH_COOLDOWN) return;

	const char = player.Character;
	const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
	const hum = char?.FindFirstChildOfClass("Humanoid");
	if (!hrp || !hum || hum.Health <= 0) return;

	lastDashTime = now;
	isDashing = true;

	// Determinar dirección de movimiento (o hacia adelante si está quieto)
	let moveDir = hum.MoveDirection;
	if (moveDir.Magnitude < 0.1) {
		moveDir = hrp.CFrame.LookVector;
	}
	moveDir = new Vector3(moveDir.X, 0, moveDir.Z).Unit;

	// Impulso físico de Dash (con i-frames)
	const dashVelocity = new Instance("BodyVelocity");
	dashVelocity.MaxForce = new Vector3(80000, 4000, 80000);
	dashVelocity.Velocity = moveDir.mul(65); // Impulso supersónico
	dashVelocity.Parent = hrp;

	// Efecto visual de Estela / Ghosting Neón
	for (let i = 0; i < 4; i++) {
		task.delay(i * 0.04, () => {
			if (!hrp || !hrp.Parent) return;
			const ghost = new Instance("Part");
			ghost.Size = hrp.Size;
			ghost.CFrame = hrp.CFrame;
			ghost.Color = new Color3(0.1, 0.95, 0.9);
			ghost.Material = Enum.Material.Neon;
			ghost.Transparency = 0.4;
			ghost.CanCollide = false;
			ghost.Anchored = true;
			ghost.Parent = Workspace;

			TweenService.Create(ghost, new TweenInfo(0.25), {
				Transparency: 1,
				Size: ghost.Size.mul(1.2),
			}).Play();
			Debris.AddItem(ghost, 0.3);
		});
	}

	task.delay(0.22, () => {
		dashVelocity.Destroy();
		isDashing = false;
	});
}

// Escuchar pulsación de Shift izquierdo o Q para Dash
UserInputService.InputBegan.Connect((input, processed) => {
	if (processed) return;
	if (input.KeyCode === Enum.KeyCode.LeftShift || input.KeyCode === Enum.KeyCode.Q) {
		triggerDash();
	}
});
// 2. Obtener referencias de RemoteEvents
let networkFolder = Workspace.WaitForChild("Network", 5) as Folder;
let damageEvent = networkFolder ? (networkFolder.WaitForChild("DamageEnemy", 5) as RemoteEvent) : undefined;
let collectGemEvent = networkFolder ? (networkFolder.WaitForChild("CollectGem", 5) as RemoteEvent) : undefined;
let levelUpEvent = networkFolder ? (networkFolder.WaitForChild("LevelUp", 5) as RemoteEvent) : undefined;
let selectUpgradeEvent = networkFolder ? (networkFolder.WaitForChild("SelectUpgrade", 5) as RemoteEvent) : undefined;

// 3. UI de Game Over
const gameOverGui = new Instance("ScreenGui");
gameOverGui.Name = "GameOverScreen";
gameOverGui.Enabled = false;
gameOverGui.ResetOnSpawn = false;
gameOverGui.Parent = playerGui;

const goBackdrop = new Instance("Frame");
goBackdrop.Size = new UDim2(1, 0, 1, 0);
goBackdrop.BackgroundColor3 = new Color3(0.05, 0.02, 0.04);
goBackdrop.BackgroundTransparency = 0.25;
goBackdrop.BorderSizePixel = 0;
goBackdrop.Parent = gameOverGui;

const goCard = new Instance("Frame");
goCard.Size = new UDim2(0, 420, 0, 360);
goCard.Position = new UDim2(0.5, -210, 0.5, -180);
goCard.BackgroundColor3 = new Color3(0.12, 0.14, 0.2);
goCard.BorderSizePixel = 0;
goCard.Parent = goBackdrop;

const goCardCorner = new Instance("UICorner");
goCardCorner.CornerRadius = new UDim(0, 16);
goCardCorner.Parent = goCard;

const goCardStroke = new Instance("UIStroke");
goCardStroke.Thickness = 3;
goCardStroke.Color = new Color3(0.9, 0.2, 0.3); // Rojo sangre neón
goCardStroke.Parent = goCard;

const goTitle = new Instance("TextLabel");
goTitle.Size = new UDim2(1, 0, 0, 50);
goTitle.Position = new UDim2(0, 0, 0.05, 0);
goTitle.BackgroundTransparency = 1;
goTitle.Font = Enum.Font.FredokaOne;
goTitle.Text = "HAS CAÍDO";
goTitle.TextSize = 36;
goTitle.TextColor3 = new Color3(0.95, 0.25, 0.3);
goTitle.TextStrokeTransparency = 0;
goTitle.Parent = goCard;

const goStats = new Instance("TextLabel");
goStats.Name = "StatsLabel";
goStats.Size = new UDim2(0.9, 0, 0, 140);
goStats.Position = new UDim2(0.05, 0, 0.25, 0);
goStats.BackgroundTransparency = 1;
goStats.Font = Enum.Font.GothamMedium;
goStats.Text = "Tiempo: 00:00\nNivel: 1\nEnemigos eliminados: 0";
goStats.TextSize = 16;
goStats.TextColor3 = new Color3(0.9, 0.9, 0.95);
goStats.LineHeight = 1.4;
goStats.Parent = goCard;

const restartBtn = new Instance("TextButton");
restartBtn.Size = new UDim2(0.7, 0, 0, 45);
restartBtn.Position = new UDim2(0.15, 0, 0.78, 0);
restartBtn.BackgroundColor3 = new Color3(0.15, 0.75, 0.45);
restartBtn.Font = Enum.Font.FredokaOne;
restartBtn.Text = "REINTENTAR PARTIDA";
restartBtn.TextColor3 = new Color3(1, 1, 1);
restartBtn.TextSize = 18;
restartBtn.BorderSizePixel = 0;
restartBtn.Parent = goCard;

const btnCorner = new Instance("UICorner");
btnCorner.CornerRadius = new UDim(0, 8);
btnCorner.Parent = restartBtn;

restartBtn.MouseButton1Click.Connect(() => {
	// Reaparecer al jugador con salud completa
	gameOverGui.Enabled = false;
	isGameOver = false;
	startTime = os.clock();
	enemiesDefeatedCount = 0;

	const char = player.Character;
	const hum = char?.FindFirstChildOfClass("Humanoid");
	if (hum) {
		hum.Health = hum.MaxHealth;
	}
	// Teleportar a la base
	const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (hrp) {
		hrp.CFrame = new CFrame(0, 3, 0);
	}
});

// Detectar muerte del jugador para mostrar Game Over y barra de salud
function connectDeathListener(character: Model) {
	const hum = character.WaitForChild("Humanoid", 5) as Humanoid;
	const hrp = character.WaitForChild("HumanoidRootPart", 5) as BasePart;

	// Barra de salud dinámica flotante sobre la cabeza
	if (hum && hrp) {
		const existingHpGui = hrp.FindFirstChild("HealthBillboard");
		if (existingHpGui) existingHpGui.Destroy();

		const hpBillboard = new Instance("BillboardGui");
		hpBillboard.Name = "HealthBillboard";
		hpBillboard.Size = new UDim2(0, 90, 0, 12);
		hpBillboard.StudsOffset = new Vector3(0, 3.2, 0);
		hpBillboard.AlwaysOnTop = true;
		hpBillboard.Adornee = hrp;
		hpBillboard.Parent = hrp;

		const bg = new Instance("Frame");
		bg.Size = new UDim2(1, 0, 1, 0);
		bg.BackgroundColor3 = new Color3(0.08, 0.1, 0.12);
		bg.BorderSizePixel = 0;
		bg.Parent = hpBillboard;

		const bgCorner = new Instance("UICorner");
		bgCorner.CornerRadius = new UDim(0, 4);
		bgCorner.Parent = bg;

		const fill = new Instance("Frame");
		fill.Name = "Fill";
		fill.Size = new UDim2(1, 0, 1, 0);
		fill.BackgroundColor3 = new Color3(0.15, 0.85, 0.4); // Verde vida
		fill.BorderSizePixel = 0;
		fill.Parent = bg;

		const fillCorner = new Instance("UICorner");
		fillCorner.CornerRadius = new UDim(0, 4);
		fillCorner.Parent = fill;

		const updateHp = () => {
			const ratio = math.clamp(hum.Health / hum.MaxHealth, 0, 1);
			TweenService.Create(fill, new TweenInfo(0.15), {
				Size: new UDim2(ratio, 0, 1, 0),
			}).Play();

			// Color dinámico según salud
			if (ratio > 0.5) {
				fill.BackgroundColor3 = new Color3(0.15, 0.85, 0.4);
			} else if (ratio > 0.25) {
				fill.BackgroundColor3 = new Color3(0.95, 0.7, 0.1); // Amarillo peligro
			} else {
				fill.BackgroundColor3 = new Color3(0.95, 0.2, 0.25); // Rojo crítico
			}
		};

		hum.HealthChanged.Connect(updateHp);
		hum.GetPropertyChangedSignal("MaxHealth").Connect(updateHp);
		updateHp();

		hum.Died.Connect(() => {
			if (isGameOver) return;
			isGameOver = true;

			const elapsed = math.floor(os.clock() - startTime);
			const mins = math.floor(elapsed / 60);
			const secs = elapsed % 60;
			const minStr = mins < 10 ? `0${mins}` : `${mins}`;
			const secStr = secs < 10 ? `0${secs}` : `${secs}`;

			const leaderstats = player.FindFirstChild("leaderstats") as Folder;
			const currentLvl = (leaderstats?.FindFirstChild("Level") as IntValue)?.Value ?? 1;

			goStats.Text = `⏱️ Tiempo Sobrevivido: ${minStr}:${secStr}\n⭐ Nivel Alcanzado: ${currentLvl}\n💀 Bajas Confirmadas: ${enemiesDefeatedCount}`;
			gameOverGui.Enabled = true;
		});
	}
}

if (player.Character) connectDeathListener(player.Character);
player.CharacterAdded.Connect(connectDeathListener);

// 4. UI del Menú de Level Up (3 Cartas)
const levelUpGui = new Instance("ScreenGui");
levelUpGui.Name = "LevelUpScreen";
levelUpGui.Enabled = false;
levelUpGui.ResetOnSpawn = false;
levelUpGui.Parent = playerGui;

const modalBackdrop = new Instance("Frame");
modalBackdrop.Size = new UDim2(1, 0, 1, 0);
modalBackdrop.BackgroundColor3 = new Color3(0, 0, 0);
modalBackdrop.BackgroundTransparency = 0.45;
modalBackdrop.BorderSizePixel = 0;
modalBackdrop.Parent = levelUpGui;

const titleHeader = new Instance("TextLabel");
titleHeader.Size = new UDim2(1, 0, 0, 50);
titleHeader.Position = new UDim2(0, 0, 0.15, 0);
titleHeader.BackgroundTransparency = 1;
titleHeader.Font = Enum.Font.FredokaOne;
titleHeader.Text = "¡SUBIDA DE NIVEL!";
titleHeader.TextSize = 34;
titleHeader.TextColor3 = new Color3(1, 0.85, 0.2);
titleHeader.TextStrokeTransparency = 0;
titleHeader.Parent = modalBackdrop;

const cardsContainer = new Instance("Frame");
cardsContainer.Size = new UDim2(0.85, 0, 0, 240);
cardsContainer.Position = new UDim2(0.075, 0, 0.32, 0);
cardsContainer.BackgroundTransparency = 1;
cardsContainer.Parent = modalBackdrop;

const uiLayout = new Instance("UIListLayout");
uiLayout.FillDirection = Enum.FillDirection.Horizontal;
uiLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
uiLayout.VerticalAlignment = Enum.VerticalAlignment.Center;
uiLayout.Padding = new UDim(0, 25);
uiLayout.Parent = cardsContainer;

let savedWalkSpeed = 16;

function showLevelUpModal() {
	if (isGameOver) return;

	isClientPaused = true;
	levelUpGui.Enabled = true;

	const hum = player.Character?.FindFirstChildOfClass("Humanoid");
	if (hum) {
		savedWalkSpeed = hum.WalkSpeed > 0 ? hum.WalkSpeed : savedWalkSpeed;
		hum.WalkSpeed = 0;
	}

	for (const child of cardsContainer.GetChildren()) {
		if (child.IsA("GuiButton")) {
			child.Destroy();
		}
	}

	const inventory = player.FindFirstChild("Inventory") as Folder;
	const boomerangLvl = (inventory?.FindFirstChild("void_boomerang") as IntValue)?.Value ?? 1;
	const plasmaLvl = (inventory?.FindFirstChild("plasma_blaster") as IntValue)?.Value ?? 0;
	const orbitsLvl = (inventory?.FindFirstChild("chrono_orbits") as IntValue)?.Value ?? 0;

	// Opciones disponibles para elegir
	const allOptions = [
		{
			id: "void_boomerang",
			title: "Búmeran del Vacío",
			tag: boomerangLvl < 3 ? `Nivel ${boomerangLvl + 1}` : "Nivel MÁX",
			desc: boomerangLvl === 1 ? "+50% daño y mayor velocidad" : "Dispara 2 búmeranes con -20% cooldown",
			color: new Color3(0.08, 0.45, 0.4),
			available: boomerangLvl < 3,
		},
		{
			id: "plasma_blaster",
			title: plasmaLvl === 0 ? "Nueva Arma: Bláster" : "Bláster de Plasma",
			tag: plasmaLvl === 0 ? "DESBLOQUEAR" : `Nivel ${plasmaLvl + 1}`,
			desc: plasmaLvl === 0 ? "Ráfagas teledirigidas de alta cadencia" : "Dispara 2 esferas de plasma a la vez",
			color: new Color3(0.45, 0.15, 0.5),
			available: plasmaLvl < 2,
		},
		{
			id: "chrono_orbits",
			title: orbitsLvl === 0 ? "Nueva: Órbitas Crono" : "Órbitas Crono",
			tag: orbitsLvl === 0 ? "DESBLOQUEAR" : `Nivel ${orbitsLvl + 1}`,
			desc: orbitsLvl === 0 ? "Orbes cinéticos que te orbitan triturando la horda" : "+1 orbe orbital y mayor velocidad de giro",
			color: new Color3(0.85, 0.65, 0.1), // Dorado radiante
			available: orbitsLvl < 3,
		},
		{
			id: "speed_boost",
			title: "Propulsores de Pies",
			tag: "PASIVA",
			desc: "+18% velocidad de movimiento permanente",
			color: new Color3(0.15, 0.35, 0.55),
			available: true,
		},
	];

	// Filtrar y tomar hasta 3 opciones
	const filtered = allOptions.filter((opt) => opt.available);
	const options = [];
	for (let i = 0; i < math.min(3, filtered.size()); i++) {
		options.push(filtered[i]);
	}

	for (const opt of options) {
		const card = new Instance("TextButton");
		card.Size = new UDim2(0, 210, 0, 230);
		card.BackgroundColor3 = opt.color;
		card.BorderSizePixel = 0;
		card.Text = "";
		card.AutoButtonColor = true;
		card.Parent = cardsContainer;

		const corner = new Instance("UICorner");
		corner.CornerRadius = new UDim(0, 12);
		corner.Parent = card;

		const stroke = new Instance("UIStroke");
		stroke.Thickness = 2.5;
		stroke.Color = new Color3(1, 1, 1);
		stroke.Transparency = 0.3;
		stroke.Parent = card;

		const cardTitle = new Instance("TextLabel");
		cardTitle.Size = new UDim2(1, -20, 0, 36);
		cardTitle.Position = new UDim2(0, 10, 0, 14);
		cardTitle.BackgroundTransparency = 1;
		cardTitle.Font = Enum.Font.FredokaOne;
		cardTitle.Text = opt.title;
		cardTitle.TextSize = 18;
		cardTitle.TextColor3 = new Color3(1, 1, 1);
		cardTitle.TextWrapped = true;
		cardTitle.Parent = card;

		const tagLabel = new Instance("TextLabel");
		tagLabel.Size = new UDim2(1, -20, 0, 22);
		tagLabel.Position = new UDim2(0, 10, 0, 52);
		tagLabel.BackgroundTransparency = 1;
		tagLabel.Font = Enum.Font.FredokaOne;
		tagLabel.Text = opt.tag;
		tagLabel.TextSize = 14;
		tagLabel.TextColor3 = new Color3(1, 0.85, 0.2);
		tagLabel.Parent = card;

		const cardDesc = new Instance("TextLabel");
		cardDesc.Size = new UDim2(1, -24, 0, 90);
		cardDesc.Position = new UDim2(0, 12, 0, 85);
		cardDesc.BackgroundTransparency = 1;
		cardDesc.Font = Enum.Font.GothamMedium;
		cardDesc.Text = opt.desc;
		cardDesc.TextSize = 13;
		cardDesc.TextColor3 = new Color3(0.9, 0.9, 0.9);
		cardDesc.TextWrapped = true;
		cardDesc.Parent = card;

		const selectBtn = new Instance("TextLabel");
		selectBtn.Size = new UDim2(0.8, 0, 0, 32);
		selectBtn.Position = new UDim2(0.1, 0, 0.8, 0);
		selectBtn.BackgroundColor3 = new Color3(1, 1, 1);
		selectBtn.Font = Enum.Font.FredokaOne;
		selectBtn.Text = "ELEGIR";
		selectBtn.TextColor3 = new Color3(0.1, 0.1, 0.1);
		selectBtn.TextSize = 14;
		selectBtn.Parent = card;

		const sCorner = new Instance("UICorner");
		sCorner.CornerRadius = new UDim(0, 6);
		sCorner.Parent = selectBtn;

		card.MouseButton1Click.Connect(() => {
			if (!selectUpgradeEvent) {
				const net = Workspace.FindFirstChild("Network") as Folder;
				if (net) selectUpgradeEvent = net.FindFirstChild("SelectUpgrade") as RemoteEvent;
			}
			selectUpgradeEvent?.FireServer(opt.id);
			levelUpGui.Enabled = false;
			isClientPaused = false;

			const currentHum = player.Character?.FindFirstChildOfClass("Humanoid");
			if (currentHum) {
				const extraSpeed = opt.id === "speed_boost" ? 3 : 0;
				currentHum.WalkSpeed = savedWalkSpeed + extraSpeed;
			}
		});
	}
}

// 5. Conectar recepción de Level Up
if (levelUpEvent) {
	levelUpEvent.OnClientEvent.Connect(() => {
		showLevelUpModal();
	});
} else {
	task.spawn(() => {
		const net = Workspace.WaitForChild("Network", 10) as Folder;
		const ev = net?.WaitForChild("LevelUp", 5) as RemoteEvent;
		ev?.OnClientEvent.Connect(() => {
			showLevelUpModal();
		});
	});
}

// 6. Actualizar barra de EXP en el cliente
task.spawn(() => {
	const leaderstats = player.WaitForChild("leaderstats", 10) as Folder;
	if (leaderstats) {
		const expVal = leaderstats.WaitForChild("EXP", 5) as NumberValue;
		const lvlVal = leaderstats.WaitForChild("Level", 5) as IntValue;

		const updateUi = () => {
			const currentLvl = lvlVal ? lvlVal.Value : 1;
			const currentExp = expVal ? expVal.Value : 0;
			const maxExp = currentLvl * 50;
			const ratio = math.clamp(currentExp / maxExp, 0, 1);

			TweenService.Create(barFill, new TweenInfo(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size: new UDim2(ratio, 0, 1, 0),
			}).Play();
			levelText.Text = `LVL ${currentLvl} - EXP: ${math.floor(currentExp)} / ${maxExp}`;
		};

		expVal?.Changed.Connect(updateUi);
		lvlVal?.Changed.Connect(updateUi);
		updateUi();
	}
});

// 7. Armas: Búmeran del Vacío
task.spawn(() => {
	while (true) {
		if (isClientPaused || isGameOver) {
			task.wait(0.2);
			continue;
		}

		const inventory = player.FindFirstChild("Inventory") as Folder;
		const boomerangLvl = (inventory?.FindFirstChild("void_boomerang") as IntValue)?.Value ?? 1;
		const boomerangDef = WEAPONS.void_boomerang.levels[math.min(boomerangLvl, WEAPONS.void_boomerang.levels.size()) - 1];

		task.wait(boomerangDef.cooldown);

		if (isClientPaused || isGameOver) continue;

		const character = player.Character;
		const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!rootPart) continue;

		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (!enemiesFolder) continue;

		let nearestDist = 9999;
		let targetPos: Vector3 | undefined = undefined;

		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = rootPart.Position.sub(enemy.Position).Magnitude;
				if (dist < nearestDist && dist <= boomerangDef.range) {
					nearestDist = dist;
					targetPos = enemy.Position;
				}
			}
		}

		if (targetPos) {
			const count = boomerangDef.projectiles;
			for (let i = 0; i < count; i++) {
				const angleOffset = count > 1 ? (i === 0 ? -0.2 : 0.2) : 0;
				fireBoomerang(rootPart.Position, targetPos, boomerangDef.damage, boomerangDef.speed, angleOffset);
			}
		}
	}
});

function fireBoomerang(startPos: Vector3, targetPos: Vector3, damage: number, speed: number, angleOffset = 0) {
	const blade = new Instance("Part");
	blade.Name = "VoidBoomerang";
	blade.Size = new Vector3(3.2, 0.4, 3.2);
	blade.Color = new Color3(0.1, 0.9, 0.8);
	blade.Material = Enum.Material.Neon;
	blade.CanCollide = false;
	blade.Anchored = true;
	blade.CFrame = new CFrame(startPos.add(new Vector3(0, 1.5, 0)));
	blade.Parent = Workspace;

	let dir = targetPos.sub(startPos).Unit;
	if (angleOffset !== 0) {
		dir = new Vector3(
			dir.X * math.cos(angleOffset) - dir.Z * math.sin(angleOffset),
			dir.Y,
			dir.X * math.sin(angleOffset) + dir.Z * math.cos(angleOffset),
		);
	}

	const maxTravel = 35;
	let traveled = 0;
	let returning = false;
	const hitCooldowns = new Map<Instance, number>();

	const connection = RunService.Heartbeat.Connect((dt) => {
		if (isClientPaused || isGameOver) return;

		blade.Orientation = blade.Orientation.add(new Vector3(0, 1600 * dt, 0));
		const rootPart = player.Character?.FindFirstChild("HumanoidRootPart") as BasePart;

		if (!returning) {
			blade.Position = blade.Position.add(dir.mul(speed * dt));
			traveled += speed * dt;
			if (traveled >= maxTravel) returning = true;
		} else {
			if (rootPart) {
				const returnDir = rootPart.Position.sub(blade.Position).Unit;
				blade.Position = blade.Position.add(returnDir.mul(speed * 1.25 * dt));
				if (rootPart.Position.sub(blade.Position).Magnitude < 3) {
					connection.Disconnect();
					blade.Destroy();
					return;
				}
			} else {
				connection.Disconnect();
				blade.Destroy();
				return;
			}
		}

		// Detección de colisiones
		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (enemiesFolder) {
			const currentTime = os.clock();
			for (const enemy of enemiesFolder.GetChildren()) {
				if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
					const dist = blade.Position.sub(enemy.Position).Magnitude;
					if (dist <= 4.0) {
						const lastHit = hitCooldowns.get(enemy) ?? 0;
						if (currentTime - lastHit >= 0.35) {
							hitCooldowns.set(enemy, currentTime);

							if (!damageEvent) {
								const net = Workspace.FindFirstChild("Network") as Folder;
								if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
							}

							const knockbackDir = enemy.Position.sub(blade.Position).Unit;
							damageEvent?.FireServer(enemy, damage, knockbackDir);
							VisualEffects.showDamagePopup(enemy.Position, damage);

							const origColor = enemy.Color;
							enemy.Color = new Color3(1, 1, 1);
							task.delay(0.08, () => {
								if (enemy && enemy.Parent) enemy.Color = origColor;
							});

							// Contabilizar bajas si el daño remata al enemigo
							const enemyHp = (enemy.GetAttribute("HP") as number) ?? 0;
							if (enemyHp - damage <= 0) {
								enemiesDefeatedCount++;
							}
						}
					}
				}
			}
		}
	});

	Debris.AddItem(blade, 4);
}

// 8. Armas: Bláster de Plasma
task.spawn(() => {
	while (true) {
		if (isClientPaused || isGameOver) {
			task.wait(0.2);
			continue;
		}

		const inventory = player.FindFirstChild("Inventory") as Folder;
		const plasmaLvl = (inventory?.FindFirstChild("plasma_blaster") as IntValue)?.Value ?? 0;

		if (plasmaLvl <= 0) {
			task.wait(1.0);
			continue;
		}

		const plasmaDef = WEAPONS.plasma_blaster.levels[math.min(plasmaLvl, WEAPONS.plasma_blaster.levels.size()) - 1];
		task.wait(plasmaDef.cooldown);

		if (isClientPaused || isGameOver) continue;

		const character = player.Character;
		const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!rootPart) continue;

		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (!enemiesFolder) continue;

		let nearestDist = 9999;
		let targetEnemy: BasePart | undefined = undefined;

		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = rootPart.Position.sub(enemy.Position).Magnitude;
				if (dist < nearestDist && dist <= plasmaDef.range) {
					nearestDist = dist;
					targetEnemy = enemy;
				}
			}
		}

		if (targetEnemy) {
			firePlasmaOrb(rootPart.Position, targetEnemy, plasmaDef.damage, plasmaDef.speed);
		}
	}
});

function firePlasmaOrb(startPos: Vector3, targetEnemy: BasePart, damage: number, speed: number) {
	const orb = new Instance("Part");
	orb.Name = "PlasmaOrb";
	orb.Shape = Enum.PartType.Ball;
	orb.Size = new Vector3(1.4, 1.4, 1.4);
	orb.Color = new Color3(0.85, 0.2, 0.95);
	orb.Material = Enum.Material.Neon;
	orb.CanCollide = false;
	orb.Anchored = true;
	orb.Position = startPos.add(new Vector3(0, 1.5, 0));
	orb.Parent = Workspace;

	const light = new Instance("PointLight");
	light.Color = orb.Color;
	light.Range = 8;
	light.Brightness = 2;
	light.Parent = orb;

	let alive = true;
	const conn = RunService.Heartbeat.Connect((dt) => {
		if (isClientPaused || isGameOver) return;

		if (!alive || !targetEnemy || !targetEnemy.Parent) {
			conn.Disconnect();
			orb.Destroy();
			return;
		}

		const dir = targetEnemy.Position.sub(orb.Position).Unit;
		orb.Position = orb.Position.add(dir.mul(speed * dt));

		const dist = orb.Position.sub(targetEnemy.Position).Magnitude;
		if (dist <= 2.2) {
			alive = false;
			conn.Disconnect();

			if (!damageEvent) {
				const net = Workspace.FindFirstChild("Network") as Folder;
				if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
			}
			damageEvent?.FireServer(targetEnemy, damage, dir);
			VisualEffects.showDamagePopup(targetEnemy.Position, damage, true);

			const enemyHp = (targetEnemy.GetAttribute("HP") as number) ?? 0;
			if (enemyHp - damage <= 0) {
				enemiesDefeatedCount++;
			}

			orb.Destroy();
		}
	});

	Debris.AddItem(orb, 2.5);
}

// 9. Armas: Órbitas Crono (Escudo cinético rotatorio)
let currentOrbInstances: Part[] = [];
let currentOrbAngle = 0;
const hitOrbCooldowns = new Map<Instance, number>();

RunService.Heartbeat.Connect((dt) => {
	if (isClientPaused || isGameOver) return;

	const inventory = player.FindFirstChild("Inventory") as Folder;
	const orbitsLvl = (inventory?.FindFirstChild("chrono_orbits") as IntValue)?.Value ?? 0;

	if (orbitsLvl <= 0) {
		if (currentOrbInstances.size() > 0) {
			currentOrbInstances.forEach((o) => o.Destroy());
			currentOrbInstances = [];
		}
		return;
	}

	const char = player.Character;
	const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (!hrp) return;

	const orbitDef = WEAPONS.chrono_orbits.levels[math.min(orbitsLvl, WEAPONS.chrono_orbits.levels.size()) - 1];
	const orbCount = orbitDef.projectiles;
	const radius = orbitDef.range;
	const rotateSpeed = orbitDef.speed;

	// Sincronizar número de orbes instanciados
	while (currentOrbInstances.size() < orbCount) {
		const orb = new Instance("Part");
		orb.Name = "ChronoOrb";
		orb.Shape = Enum.PartType.Ball;
		orb.Size = new Vector3(1.6, 1.6, 1.6);
		orb.Color = new Color3(1.0, 0.8, 0.1); // Oro radiante
		orb.Material = Enum.Material.Neon;
		orb.CanCollide = false;
		orb.Anchored = true;
		orb.Parent = Workspace;

		const light = new Instance("PointLight");
		light.Color = orb.Color;
		light.Range = 8;
		light.Brightness = 2;
		light.Parent = orb;

		currentOrbInstances.push(orb);
	}

	currentOrbAngle += rotateSpeed * dt;

	// Actualizar posición de cada orbe y chequear colisiones
	const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
	const now = os.clock();

	currentOrbInstances.forEach((orb, i) => {
		const angleOffset = (i / orbCount) * math.pi * 2;
		const totalAngle = currentOrbAngle + angleOffset;
		const targetOrbPos = hrp.Position.add(
			new Vector3(math.cos(totalAngle) * radius, math.sin(currentOrbAngle * 2 + i) * 0.4, math.sin(totalAngle) * radius),
		);
		orb.Position = targetOrbPos;

		// Detección de colisión con enemigos
		if (enemiesFolder) {
			for (const enemy of enemiesFolder.GetChildren()) {
				if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
					const dist = orb.Position.sub(enemy.Position).Magnitude;
					if (dist <= 2.8) {
						const lastHit = hitOrbCooldowns.get(enemy) ?? 0;
						if (now - lastHit >= 0.3) {
							hitOrbCooldowns.set(enemy, now);

							if (!damageEvent) {
								const net = Workspace.FindFirstChild("Network") as Folder;
								if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
							}

							const knockbackDir = enemy.Position.sub(hrp.Position).Unit;
							damageEvent?.FireServer(enemy, orbitDef.damage, knockbackDir);
							VisualEffects.showDamagePopup(enemy.Position, orbitDef.damage, true);

							const origColor = enemy.Color;
							enemy.Color = new Color3(1, 1, 1);
							task.delay(0.08, () => {
								if (enemy && enemy.Parent) enemy.Color = origColor;
							});

							const enemyHp = (enemy.GetAttribute("HP") as number) ?? 0;
							if (enemyHp - orbitDef.damage <= 0) {
								enemiesDefeatedCount++;
							}
						}
					}
				}
			}
		}
	});
});

// 10. Loop de recolección/imantación de gemas hacia el jugador
RunService.Heartbeat.Connect((dt) => {
	if (isClientPaused || isGameOver) return;

	const character = player.Character;
	const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (!rootPart) return;

	const dropsFolder = Workspace.FindFirstChild("Drops") as Folder;
	if (!dropsFolder) return;

	const magnetRadius = 16;
	const pickupRadius = 2.5;

	for (const drop of dropsFolder.GetChildren()) {
		if (drop.IsA("BasePart") && drop.GetAttribute("Collected") !== true) {
			const dist = rootPart.Position.sub(drop.Position).Magnitude;
			if (dist <= magnetRadius) {
				const pullDir = rootPart.Position.sub(drop.Position).Unit;
				const magnetSpeed = 24 + (magnetRadius - dist) * 2;
				drop.Position = drop.Position.add(pullDir.mul(magnetSpeed * dt));

				if (dist <= pickupRadius) {
					drop.SetAttribute("Collected", true);
					if (!collectGemEvent) {
						const net = Workspace.FindFirstChild("Network") as Folder;
						if (net) collectGemEvent = net.FindFirstChild("CollectGem") as RemoteEvent;
					}
					collectGemEvent?.FireServer(drop);

					TweenService.Create(drop, new TweenInfo(0.18), {
						Size: new Vector3(0.05, 0.05, 0.05),
						Transparency: 1,
					}).Play();
					Debris.AddItem(drop, 0.22);
				}
			}
		}
	}
});
