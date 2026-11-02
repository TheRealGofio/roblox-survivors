import { Debris, Players, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { TACTICAL_PLATFORMS, TacticalPlatformConfig } from "shared/platforms";
import { WEAPONS } from "shared/weapons";
import { VisualEffects } from "./effects";
import { SoundManager } from "./sound";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// Estado local de pausa y partida
let isClientPaused = false;
let isGameOver = false;
let startTime = os.clock();
let enemiesDefeatedCount = 0;

// Estado de Buff activo por Plataformas Tácticas
let activePlatformBuff: "heal" | "damage" | "cooldown" | undefined = undefined;
let currentBastionIndex = -1;

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

// Barra de Salud de Jefe Colosal en el HUD (Top Center, debajo del reloj)
const bossFrame = new Instance("Frame");
bossFrame.Name = "BossHealthFrame";
bossFrame.Size = new UDim2(0, 360, 0, 44);
bossFrame.Position = new UDim2(0.5, -180, 0.088, 0);
bossFrame.BackgroundColor3 = new Color3(0.08, 0.05, 0.12);
bossFrame.BackgroundTransparency = 0.2;
bossFrame.BorderSizePixel = 0;
bossFrame.Visible = false;
bossFrame.Parent = hudScreen;

const bfCorner = new Instance("UICorner");
bfCorner.CornerRadius = new UDim(0, 8);
bfCorner.Parent = bossFrame;

const bfStroke = new Instance("UIStroke");
bfStroke.Color = new Color3(0.95, 0.2, 0.35); // Borde carmesí neón
bfStroke.Thickness = 1.5;
bfStroke.Parent = bossFrame;

const bossTopRow = new Instance("Frame");
bossTopRow.Size = new UDim2(1, -16, 0, 18);
bossTopRow.Position = new UDim2(0, 8, 0, 4);
bossTopRow.BackgroundTransparency = 1;
bossTopRow.Parent = bossFrame;

const bossNameLabel = new Instance("TextLabel");
bossNameLabel.Name = "BossName";
bossNameLabel.Size = new UDim2(0.7, 0, 1, 0);
bossNameLabel.BackgroundTransparency = 1;
bossNameLabel.Font = Enum.Font.FredokaOne;
bossNameLabel.Text = "👑 COLOSO DE OBSIDIANA";
bossNameLabel.TextColor3 = new Color3(1, 0.85, 0.4);
bossNameLabel.TextSize = 13;
bossNameLabel.TextXAlignment = Enum.TextXAlignment.Left;
bossNameLabel.Parent = bossTopRow;

const bossHpLabel = new Instance("TextLabel");
bossHpLabel.Name = "BossHpText";
bossHpLabel.Size = new UDim2(0.3, 0, 1, 0);
bossHpLabel.Position = new UDim2(0.7, 0, 0, 0);
bossHpLabel.BackgroundTransparency = 1;
bossHpLabel.Font = Enum.Font.FredokaOne;
bossHpLabel.Text = "100%";
bossHpLabel.TextColor3 = new Color3(1, 0.3, 0.4);
bossHpLabel.TextSize = 12;
bossHpLabel.TextXAlignment = Enum.TextXAlignment.Right;
bossHpLabel.Parent = bossTopRow;

const bossBarBg = new Instance("Frame");
bossBarBg.Name = "BossBarBg";
bossBarBg.Size = new UDim2(1, -16, 0, 12);
bossBarBg.Position = new UDim2(0, 8, 0, 24);
bossBarBg.BackgroundColor3 = new Color3(0.2, 0.05, 0.08);
bossBarBg.BorderSizePixel = 0;
bossBarBg.Parent = bossFrame;

const bbgCorner = new Instance("UICorner");
bbgCorner.CornerRadius = new UDim(0, 4);
bbgCorner.Parent = bossBarBg;

const bossBarFill = new Instance("Frame");
bossBarFill.Name = "BossBarFill";
bossBarFill.Size = new UDim2(1, 0, 1, 0);
bossBarFill.BackgroundColor3 = new Color3(0.95, 0.2, 0.3);
bossBarFill.BorderSizePixel = 0;
bossBarFill.Parent = bossBarBg;

const bfillCorner = new Instance("UICorner");
bfillCorner.CornerRadius = new UDim(0, 4);
bfillCorner.Parent = bossBarFill;

const bossGradient = new Instance("UIGradient");
bossGradient.Color = new ColorSequence([
	new ColorSequenceKeypoint(0, new Color3(0.75, 0.1, 0.3)),
	new ColorSequenceKeypoint(0.5, new Color3(0.95, 0.25, 0.35)),
	new ColorSequenceKeypoint(1, new Color3(1.0, 0.6, 0.3)),
]);
bossGradient.Parent = bossBarFill;

// Loop reactivo de actualización de la barra de salud del jefe
task.spawn(() => {
	while (true) {
		task.wait(0.1);
		if (isGameOver) {
			bossFrame.Visible = false;
			continue;
		}

		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		let activeBoss: BasePart | undefined = undefined;

		if (enemiesFolder) {
			for (const enemy of enemiesFolder.GetChildren()) {
				if (enemy.IsA("BasePart")) {
					const isBoss = enemy.GetAttribute("IsBoss") === true || enemy.GetAttribute("Behavior") === "boss";
					const hp = (enemy.GetAttribute("HP") as number) ?? 0;
					if (isBoss && hp > 0) {
						activeBoss = enemy;
						break;
					}
				}
			}
		}

		if (activeBoss) {
			const hp = math.max(0, (activeBoss.GetAttribute("HP") as number) ?? 0);
			const maxHp = math.max(1, (activeBoss.GetAttribute("MaxHP") as number) ?? 100);
			const rawName = (activeBoss.GetAttribute("EnemyName") as string) ?? activeBoss.Name;
			const bossName = rawName.gsub("_%d+", "")[0];

			bossNameLabel.Text = `👑 ${bossName.upper()}`;
			const pct = math.clamp(hp / maxHp, 0, 1);
			bossHpLabel.Text = `${math.floor(hp)} / ${maxHp} (${math.floor(pct * 100)}%)`;

			TweenService.Create(bossBarFill, new TweenInfo(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size: new UDim2(pct, 0, 1, 0),
			}).Play();

			if (!bossFrame.Visible) {
				bossFrame.Visible = true;
			}
		} else {
			if (bossFrame.Visible) {
				bossFrame.Visible = false;
			}
		}
	}
});

// Indicador / Cooldown de Dash en HUD
const dashIndicator = new Instance("Frame");
dashIndicator.Name = "DashIndicator";
dashIndicator.Size = new UDim2(0, 130, 0, 24);
dashIndicator.Position = new UDim2(0.5, -135, 0.88, 0); // Desplazado a la izquierda
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
dashText.Text = "⚡ DASH [SHIFT]";
dashText.TextColor3 = new Color3(0.2, 0.9, 0.95);
dashText.TextSize = 13;
dashText.Parent = dashIndicator;

// Indicador / Cooldown de Za Warudo en HUD
const zaWarudoIndicator = new Instance("Frame");
zaWarudoIndicator.Name = "ZaWarudoIndicator";
zaWarudoIndicator.Size = new UDim2(0, 130, 0, 24);
zaWarudoIndicator.Position = new UDim2(0.5, 5, 0.88, 0); // A la derecha del Dash
zaWarudoIndicator.BackgroundColor3 = new Color3(0.15, 0.1, 0.22);
zaWarudoIndicator.BorderSizePixel = 0;
zaWarudoIndicator.Parent = hudScreen;

const zwCorner = new Instance("UICorner");
zwCorner.CornerRadius = new UDim(0, 6);
zwCorner.Parent = zaWarudoIndicator;

const zwText = new Instance("TextLabel");
zwText.Name = "ZaWarudoText";
zwText.Size = new UDim2(1, 0, 1, 0);
zwText.BackgroundTransparency = 1;
zwText.Font = Enum.Font.FredokaOne;
zwText.Text = "⏱️ STASIS [E]";
zwText.TextColor3 = new Color3(0.85, 0.45, 1.0); // Violeta / Púrpura
zwText.TextSize = 13;
zwText.Parent = zaWarudoIndicator;

// Cooldown de Za Warudo (40 segundos)
const ZA_WARUDO_COOLDOWN = 40.0;
let lastZaWarudoTime = -ZA_WARUDO_COOLDOWN;

// Indicador de Buff Activo en HUD
const buffBadge = new Instance("TextLabel");
buffBadge.Name = "BuffBadge";
buffBadge.Size = new UDim2(0, 240, 0, 26);
buffBadge.Position = new UDim2(0.5, -120, 0.83, 0);
buffBadge.BackgroundColor3 = new Color3(0.1, 0.12, 0.16);
buffBadge.BackgroundTransparency = 0.2;
buffBadge.Font = Enum.Font.FredokaOne;
buffBadge.Text = "";
buffBadge.TextColor3 = new Color3(1, 1, 1);
buffBadge.TextSize = 13;
buffBadge.Visible = false;
buffBadge.Parent = hudScreen;

const bbCorner = new Instance("UICorner");
bbCorner.CornerRadius = new UDim(0, 6);
bbCorner.Parent = buffBadge;

// Loop de chequeo de presencia en Plataformas Tácticas
task.spawn(() => {
	let lastHealTick = 0;
	while (true) {
		task.wait(0.2);
		if (isGameOver || isClientPaused) continue;

		const char = player.Character;
		const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
		const hum = char?.FindFirstChildOfClass("Humanoid");
		if (!hrp || !hum || hum.Health <= 0) continue;

		let foundPlat: TacticalPlatformConfig | undefined = undefined;

		for (const plat of TACTICAL_PLATFORMS) {
			const dist = new Vector2(hrp.Position.X - plat.position.X, hrp.Position.Z - plat.position.Z).Magnitude;
			if (dist <= plat.radius) {
				foundPlat = plat;
				break;
			}
		}

		if (foundPlat) {
			activePlatformBuff = foundPlat.buffType;
			buffBadge.Text = `⚡ ${foundPlat.buffName} (${foundPlat.buffDesc})`;
			buffBadge.TextColor3 = foundPlat.color;
			buffBadge.Visible = true;

			// Efecto de Curación Continua en Bastión Norte
			if (foundPlat.buffType === "heal") {
				const now = os.clock();
				if (now - lastHealTick >= 1.0) {
					lastHealTick = now;
					hum.Health = math.min(hum.MaxHealth, hum.Health + 8);
				}
			}
		} else {
			activePlatformBuff = undefined;
			buffBadge.Visible = false;
		}
	}
});

task.spawn(() => {
	while (true) {
		task.wait(0.1);
		const timeSinceDash = os.clock() - lastDashTime;
		if (timeSinceDash >= DASH_COOLDOWN) {
			dashText.Text = "⚡ DASH [SHIFT]";
			dashText.TextColor3 = new Color3(0.2, 0.9, 0.95);
		} else {
			const remaining = string.format("%.1f", math.max(0, DASH_COOLDOWN - timeSinceDash));
			dashText.Text = `⏳ ${remaining}s`;
			dashText.TextColor3 = new Color3(0.6, 0.6, 0.65);
		}

		const timeSinceZw = os.clock() - lastZaWarudoTime;
		if (timeSinceZw >= ZA_WARUDO_COOLDOWN) {
			zwText.Text = "⏱️ STASIS [E]";
			zwText.TextColor3 = new Color3(0.85, 0.45, 1.0);
		} else {
			const remainingZw = string.format("%.1f", math.max(0, ZA_WARUDO_COOLDOWN - timeSinceZw));
			zwText.Text = `⏳ ${remainingZw}s`;
			zwText.TextColor3 = new Color3(0.6, 0.6, 0.65);
		}
	}
});

// Filtro Violeta Cósmico en Pantalla para Za Warudo
const stasisOverlay = new Instance("Frame");
stasisOverlay.Name = "StasisOverlay";
stasisOverlay.Size = new UDim2(1, 0, 1, 0);
stasisOverlay.BackgroundColor3 = new Color3(0.35, 0.05, 0.55); // Violeta temporal
stasisOverlay.BackgroundTransparency = 1;
stasisOverlay.BorderSizePixel = 0;
stasisOverlay.Visible = false;
stasisOverlay.Parent = hudScreen;

const stasisText = new Instance("TextLabel");
stasisText.Size = new UDim2(1, 0, 0, 80);
stasisText.Position = new UDim2(0, 0, 0.4, 0);
stasisText.BackgroundTransparency = 1;
stasisText.Font = Enum.Font.FredokaOne;
stasisText.Text = "THE WORLD (ESTASIS TEMPORAL)";
stasisText.TextSize = 36;
stasisText.TextColor3 = new Color3(0.9, 0.6, 1.0);
stasisText.TextStrokeTransparency = 0;
stasisText.Parent = stasisOverlay;

function triggerLocalZaWarudo() {
	if (isClientPaused || isGameOver) return;
	const now = os.clock();
	if (now - lastZaWarudoTime < ZA_WARUDO_COOLDOWN) return;

	lastZaWarudoTime = now;

	let zwEvent = networkFolder?.FindFirstChild("ZaWarudo") as RemoteEvent;
	if (!zwEvent) {
		const net = Workspace.FindFirstChild("Network") as Folder;
		if (net) zwEvent = net.FindFirstChild("ZaWarudo") as RemoteEvent;
	}
	zwEvent?.FireServer();
}

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
	SoundManager.playDashSound();

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

// Escuchar pulsación de Shift/Q para Dash y E para Za Warudo
UserInputService.InputBegan.Connect((input, processed) => {
	if (processed) return;
	if (input.KeyCode === Enum.KeyCode.LeftShift || input.KeyCode === Enum.KeyCode.Q) {
		triggerDash();
	} else if (input.KeyCode === Enum.KeyCode.E) {
		triggerLocalZaWarudo();
	}
});
// 2. Obtener referencias de RemoteEvents
let networkFolder = Workspace.WaitForChild("Network", 5) as Folder;
let damageEvent = networkFolder ? (networkFolder.WaitForChild("DamageEnemy", 5) as RemoteEvent) : undefined;
let collectGemEvent = networkFolder ? (networkFolder.WaitForChild("CollectGem", 5) as RemoteEvent) : undefined;
let levelUpEvent = networkFolder ? (networkFolder.WaitForChild("LevelUp", 5) as RemoteEvent) : undefined;
let selectUpgradeEvent = networkFolder ? (networkFolder.WaitForChild("SelectUpgrade", 5) as RemoteEvent) : undefined;
let bossAlertEvent = networkFolder ? (networkFolder.WaitForChild("BossAlert", 5) as RemoteEvent) : undefined;
let debugActionEvent = networkFolder ? (networkFolder.WaitForChild("DebugAction", 5) as RemoteEvent) : undefined;

let restartGameEvent = networkFolder ? (networkFolder.WaitForChild("RestartGame", 5) as RemoteEvent) : undefined;
let zaWarudoEvent = networkFolder ? (networkFolder.WaitForChild("ZaWarudo", 5) as RemoteEvent) : undefined;

// Conectar evento Za Warudo para efectos visuales y onda de choque
const connectZaWarudoListener = (ev?: RemoteEvent) => {
	ev?.OnClientEvent.Connect((durationArg: unknown) => {
		const duration = typeOf(durationArg) === "number" ? (durationArg as number) : 4.0;

		// Activar filtro violeta
		stasisOverlay.Visible = true;
		stasisOverlay.BackgroundTransparency = 0.55;
		SoundManager.playSound("levelUp", 1.0, 0.5); // Sonido grave temporal

		// Onda expansiva holográfica desde el jugador
		const char = player.Character;
		const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (hrp) {
			const ring = new Instance("Part");
			ring.Shape = Enum.PartType.Cylinder;
			ring.Size = new Vector3(0.5, 4, 4);
			ring.CFrame = new CFrame(hrp.Position).mul(CFrame.Angles(0, 0, math.rad(90)));
			ring.Color = new Color3(0.85, 0.35, 1.0);
			ring.Material = Enum.Material.Neon;
			ring.CanCollide = false;
			ring.Anchored = true;
			ring.Parent = Workspace;

			TweenService.Create(ring, new TweenInfo(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size: new Vector3(0.5, 80, 80),
				Transparency: 1,
			}).Play();
			Debris.AddItem(ring, 0.7);
		}

		// Desvanecer overlay al terminar el tiempo de estasis
		task.delay(duration - 0.5, () => {
			TweenService.Create(stasisOverlay, new TweenInfo(0.5), {
				BackgroundTransparency: 1,
			}).Play();
			task.delay(0.5, () => {
				stasisOverlay.Visible = false;
			});
		});
	});
};

if (zaWarudoEvent) connectZaWarudoListener(zaWarudoEvent);
else {
	task.spawn(() => {
		const net = Workspace.WaitForChild("Network", 10) as Folder;
		const ev = net?.WaitForChild("ZaWarudo", 5) as RemoteEvent;
		connectZaWarudoListener(ev);
	});
}

// Panel de Debug Plegable Organizado por Categorías (F2 o Botón)
const debugGui = new Instance("ScreenGui");
debugGui.Name = "DebugGui";
debugGui.ResetOnSpawn = false;
debugGui.Parent = playerGui;

const debugToggleBtn = new Instance("TextButton");
debugToggleBtn.Name = "DebugToggle";
debugToggleBtn.Size = new UDim2(0, 95, 0, 30);
debugToggleBtn.Position = new UDim2(0.98, -95, 0.02, 0);
debugToggleBtn.BackgroundColor3 = new Color3(0.18, 0.2, 0.28);
debugToggleBtn.Font = Enum.Font.FredokaOne;
debugToggleBtn.Text = "🛠️ DEBUG";
debugToggleBtn.TextColor3 = new Color3(1, 0.85, 0.2);
debugToggleBtn.TextSize = 13;
debugToggleBtn.Parent = debugGui;

const dbCorner = new Instance("UICorner");
dbCorner.CornerRadius = new UDim(0, 6);
dbCorner.Parent = debugToggleBtn;

const debugPanel = new Instance("Frame");
debugPanel.Name = "DebugPanel";
debugPanel.Size = new UDim2(0, 520, 0, 310); // Panel horizontal apaisado con columnas
debugPanel.Position = new UDim2(0.98, -520, 0.065, 0);
debugPanel.BackgroundColor3 = new Color3(0.08, 0.1, 0.14);
debugPanel.BorderSizePixel = 0;
debugPanel.Visible = false;
debugPanel.Parent = debugGui;

const dpCorner = new Instance("UICorner");
dpCorner.CornerRadius = new UDim(0, 8);
dpCorner.Parent = debugPanel;

const dpStroke = new Instance("UIStroke");
dpStroke.Color = new Color3(1, 0.85, 0.2);
dpStroke.Thickness = 1.5;
dpStroke.Parent = debugPanel;

const columnsContainer = new Instance("Frame");
columnsContainer.Size = new UDim2(1, -16, 1, -16);
columnsContainer.Position = new UDim2(0, 8, 0, 8);
columnsContainer.BackgroundTransparency = 1;
columnsContainer.Parent = columnsContainer ? debugPanel : debugPanel;

const columnsLayout = new Instance("UIListLayout");
columnsLayout.FillDirection = Enum.FillDirection.Horizontal;
columnsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
columnsLayout.Padding = new UDim(0, 10);
columnsLayout.Parent = columnsContainer;

// 3 Categorías: Armas, Pasivas y Entorno/General
const debugCategories = [
	{
		title: "⚔️ ARMAS",
		headerColor: new Color3(0.95, 0.35, 0.2),
		buttons: [
			{ id: "unlock_all_weapons", label: "⚡ TODAS MÁX" },
			{ id: "give_nova", label: "🔥 Rayo Nova" },
			{ id: "give_orbits", label: "🪐 Órbitas Crono" },
			{ id: "give_plasma", label: "🟣 Bláster Plasma" },
			{ id: "give_flare", label: "💥 Fulgor Éter" },
			{ id: "give_mines", label: "💣 Minas Vórtice" },
		],
	},
	{
		title: "✨ PASIVAS & STATS",
		headerColor: new Color3(0.2, 0.75, 0.95),
		buttons: [
			{ id: "trigger_zawarudo", label: "⏱️ ZA WARUDO" },
			{ id: "instant_level_up", label: "⭐ Level Up (+1)" },
			{ id: "heal_player", label: "❤️ Curar al 100%" },
			{ id: "give_speed", label: "👟 +6 Velocidad" },
			{ id: "give_magnet", label: "🧲 +8 Imán EXP" },
			{ id: "give_area", label: "📏 +25% Área" },
		],
	},
	{
		title: "🌍 ENTORNO / SPAWNS",
		headerColor: new Color3(0.9, 0.8, 0.2),
		buttons: [
			{ id: "spawn_boss", label: "👑 Invocar Boss" },
			{ id: "spawn_chest", label: "📦 Spawn Cofre" },
			{ id: "spawn_magnet", label: "🧲 Spawn Imán" },
			{ id: "tp_bastion", label: "🏛️ TP Bastión" },
			{ id: "kill_all_enemies", label: "💥 Limpiar Arena" },
		],
	},
];

debugCategories.forEach((cat) => {
	const col = new Instance("Frame");
	col.Size = new UDim2(0.31, 0, 1, 0);
	col.BackgroundColor3 = new Color3(0.12, 0.14, 0.2);
	col.BorderSizePixel = 0;
	col.Parent = columnsContainer;

	const cCorner = new Instance("UICorner");
	cCorner.CornerRadius = new UDim(0, 6);
	cCorner.Parent = col;

	const cLayout = new Instance("UIListLayout");
	cLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
	cLayout.Padding = new UDim(0, 4);
	cLayout.Parent = col;

	const header = new Instance("TextLabel");
	header.Size = new UDim2(1, 0, 0, 24);
	header.BackgroundTransparency = 1;
	header.Font = Enum.Font.FredokaOne;
	header.Text = cat.title;
	header.TextColor3 = cat.headerColor;
	header.TextSize = 12;
	header.Parent = col;

	cat.buttons.forEach((btnInfo) => {
		const b = new Instance("TextButton");
		b.Size = new UDim2(0.92, 0, 0, 30);
		b.BackgroundColor3 = new Color3(0.18, 0.22, 0.3);
		b.Font = Enum.Font.FredokaOne;
		b.Text = btnInfo.label;
		b.TextColor3 = new Color3(1, 1, 1);
		b.TextSize = 11;
		b.Parent = col;

		const bCorner = new Instance("UICorner");
		bCorner.CornerRadius = new UDim(0, 5);
		bCorner.Parent = b;

		b.MouseButton1Click.Connect(() => {
			if (btnInfo.id === "tp_bastion") {
				// Teletransportar al jugador rotativamente a cada una de las 3 plataformas tácticas
				const hrp = player.Character?.FindFirstChild("HumanoidRootPart") as BasePart;
				if (hrp && TACTICAL_PLATFORMS.size() > 0) {
					currentBastionIndex = (currentBastionIndex + 1) % TACTICAL_PLATFORMS.size();
					const targetPlat = TACTICAL_PLATFORMS[currentBastionIndex];
					hrp.CFrame = new CFrame(targetPlat.position.add(new Vector3(0, 3, 0)));
				}
				return;
			}
			if (!debugActionEvent) {
				const net = Workspace.FindFirstChild("Network") as Folder;
				if (net) debugActionEvent = net.FindFirstChild("DebugAction") as RemoteEvent;
			}
			debugActionEvent?.FireServer(btnInfo.id);
		});
	});
});

debugToggleBtn.MouseButton1Click.Connect(() => {
	debugPanel.Visible = !debugPanel.Visible;
});

// Atajo de teclado F2 para abrir/cerrar debug
UserInputService.InputBegan.Connect((input, processed) => {
	if (processed) return;
	if (input.KeyCode === Enum.KeyCode.F2) {
		debugPanel.Visible = !debugPanel.Visible;
	}
});

// Banner Alerta de Boss en Pantalla
const bossBanner = new Instance("TextLabel");
bossBanner.Name = "BossBanner";
bossBanner.Size = new UDim2(1, 0, 0, 60);
bossBanner.Position = new UDim2(0, 0, 0.12, 0);
bossBanner.BackgroundTransparency = 1;
bossBanner.Font = Enum.Font.FredokaOne;
bossBanner.Text = "⚠️ ¡SEÑOR DEL VACÍO HA DESPERTADO! ⚠️";
bossBanner.TextSize = 28;
bossBanner.TextColor3 = new Color3(1.0, 0.15, 0.2); // Rojo alarma
bossBanner.TextStrokeTransparency = 0;
bossBanner.Visible = false;
bossBanner.Parent = hudScreen;

const connectBossAlert = (ev?: RemoteEvent) => {
	ev?.OnClientEvent.Connect((msg: unknown) => {
		const text = typeOf(msg) === "string" ? (msg as string) : "¡BOSS INMINENTE!";
		bossBanner.Text = `⚠️ ${text} ⚠️`;
		bossBanner.Visible = true;
		SoundManager.playSound("levelUp", 1.0, 0.6); // Tono grave amenazante
		task.delay(5, () => {
			bossBanner.Visible = false;
		});
	});
};
if (bossAlertEvent) connectBossAlert(bossAlertEvent);
else {
	task.spawn(() => {
		const net = Workspace.WaitForChild("Network", 10) as Folder;
		const ev = net?.WaitForChild("BossAlert", 5) as RemoteEvent;
		connectBossAlert(ev);
	});
}

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
	// Reaparecer al jugador con salud completa y resetear partida
	gameOverGui.Enabled = false;
	isGameOver = false;
	isClientPaused = false;
	startTime = os.clock();
	enemiesDefeatedCount = 0;

	// Avisar al servidor para limpiar todos los enemigos, orbes hostiles y gemas
	if (!restartGameEvent) {
		const net = Workspace.FindFirstChild("Network") as Folder;
		if (net) restartGameEvent = net.FindFirstChild("RestartGame") as RemoteEvent;
	}
	restartGameEvent?.FireServer();
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

levelUpGui.GetPropertyChangedSignal("Enabled").Connect(() => {
	if (!levelUpGui.Enabled) {
		isClientPaused = false;
		const hum = player.Character?.FindFirstChildOfClass("Humanoid");
		if (hum && hum.WalkSpeed === 0) {
			hum.WalkSpeed = savedWalkSpeed > 0 ? savedWalkSpeed : 16;
		}
	}
});

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
	const novaLvl = (inventory?.FindFirstChild("nova_beam") as IntValue)?.Value ?? 0;
	const flareLvl = (inventory?.FindFirstChild("aether_flare") as IntValue)?.Value ?? 0;
	const mineLvl = (inventory?.FindFirstChild("vortex_mine") as IntValue)?.Value ?? 0;

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
			title: plasmaLvl === 0 ? "Nueva: Bláster" : "Bláster de Plasma",
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
			color: new Color3(0.85, 0.65, 0.1),
			available: orbitsLvl < 3,
		},
		{
			id: "nova_beam",
			title: novaLvl === 0 ? "Nueva: Rayo Nova" : "Rayo Nova",
			tag: novaLvl === 0 ? "DESBLOQUEAR" : `Nivel ${novaLvl + 1}`,
			desc: novaLvl === 0 ? "Haz láser de alta energía que calcina columnas de enemigos" : "+60% de anchura, alcance y daño brutal",
			color: new Color3(0.95, 0.35, 0.1), // Naranja ardiente
			available: novaLvl < 3,
		},
		{
			id: "aether_flare",
			title: flareLvl === 0 ? "Nueva: Fulgor Éter" : "Fulgor de Éter",
			tag: flareLvl === 0 ? "DESBLOQUEAR" : `Nivel ${flareLvl + 1}`,
			desc: flareLvl === 0 ? "Onda de choque radial de fuego solar que arrasa hordas" : "+55% daño, mayor alcance y menor recarga",
			color: new Color3(0.95, 0.60, 0.12),
			available: flareLvl < 3,
		},
		{
			id: "vortex_mine",
			title: mineLvl === 0 ? "Nueva: Minas Vórtice" : "Minas de Vórtice",
			tag: mineLvl === 0 ? "DESBLOQUEAR" : `Nivel ${mineLvl + 1}`,
			desc: mineLvl === 0 ? "Despliega minas gravitatorias de implosión devastadora" : "+1 mina simultánea y radio expansivo aumentado",
			color: new Color3(0.65, 0.25, 0.95),
			available: mineLvl < 3,
		},
		{
			id: "speed_boost",
			title: "Propulsores de Pies",
			tag: "PASIVA",
			desc: "+18% velocidad de movimiento permanente",
			color: new Color3(0.15, 0.35, 0.55),
			available: true,
		},
		{
			id: "magnet_range",
			title: "Imán Gravitatorio",
			tag: "PASIVA",
			desc: "+8 studs de alcance de atracción de gemas EXP",
			color: new Color3(0.2, 0.65, 0.95),
			available: true,
		},
		{
			id: "area_size",
			title: "Expansión Cósmica",
			tag: "PASIVA",
			desc: "+25% al área y alcance de todas tus armas",
			color: new Color3(0.9, 0.3, 0.7),
			available: true,
		},
		{
			id: "max_hp",
			title: "Blindaje Reforzado",
			tag: "PASIVA",
			desc: "+25 HP máxima y curación instantánea",
			color: new Color3(0.2, 0.7, 0.35),
			available: true,
		},
	];

	// Filtrar y barajar aleatoriamente para ofrecer 3 opciones variadas cada subida de nivel
	const filtered = allOptions.filter((opt) => opt.available);
	for (let i = filtered.size() - 1; i > 0; i--) {
		const j = math.floor(math.random() * (i + 1));
		const temp = filtered[i];
		filtered[i] = filtered[j];
		filtered[j] = temp;
	}

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
		SoundManager.playLevelUpSound();
		showLevelUpModal();
	});
} else {
	task.spawn(() => {
		const net = Workspace.WaitForChild("Network", 10) as Folder;
		const ev = net?.WaitForChild("LevelUp", 5) as RemoteEvent;
		ev?.OnClientEvent.Connect(() => {
			SoundManager.playLevelUpSound();
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

// 6.5 Gestor de Efectos Visuales y Muerte de Enemigos en el Cliente (Placeholders fluidos a 60 FPS)
function setupEnemyVisuals(enemy: Instance) {
	if (!enemy.IsA("BasePart")) return;
	if (enemy.GetAttribute("VisualSetupDone")) return;
	enemy.SetAttribute("VisualSetupDone", true);

	let isDead = false;

	const onDeath = () => {
		if (isDead) return;
		isDead = true;

		const visualModel = enemy.FindFirstChild("VisualModel") as Model | undefined;
		if (visualModel) {
			// Quitar highlight de hit flash si estuviera activo
			const hl = visualModel.FindFirstChild("HitFlashHighlight");
			if (hl) hl.Destroy();

			// Efecto de desintegración y hundimiento suave estilo arcade
			const startCf = visualModel.GetPivot();
			const targetCf = startCf.sub(new Vector3(0, 2.0, 0));
			const duration = 0.35;
			const startTime = os.clock();

			const meshParts: BasePart[] = [];
			for (const d of visualModel.GetDescendants()) {
				if (d.IsA("BasePart")) meshParts.push(d);
			}

			const conn = RunService.RenderStepped.Connect(() => {
				const elapsed = os.clock() - startTime;
				const progress = math.clamp(elapsed / duration, 0, 1);
				visualModel.PivotTo(startCf.Lerp(targetCf, progress));

				// Reducción suave de escala y desvanecimiento
				const scaleFactor = math.max(0.05, 1 - progress);
				pcall(() => visualModel.ScaleTo(scaleFactor));

				for (const p of meshParts) {
					p.Transparency = progress;
				}

				if (progress >= 1) {
					conn.Disconnect();
					visualModel.Destroy();
				}
			});
		}
	};

	const hpConn = enemy.GetAttributeChangedSignal("HP").Connect(() => {
		const hp = (enemy.GetAttribute("HP") as number) ?? 0;
		if (hp <= 0) onDeath();
	});

	const deadConn = enemy.GetAttributeChangedSignal("IsDead").Connect(() => {
		if (enemy.GetAttribute("IsDead") === true) onDeath();
	});

	enemy.Destroying.Connect(() => {
		isDead = true;
		hpConn.Disconnect();
		deadConn.Disconnect();
	});
}

task.spawn(() => {
	const enemiesFolder = Workspace.WaitForChild("Enemies", 10) as Folder;
	if (enemiesFolder) {
		enemiesFolder.GetChildren().forEach(setupEnemyVisuals);
		enemiesFolder.ChildAdded.Connect(setupEnemyVisuals);
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

		const cdMultiplier = activePlatformBuff === "cooldown" ? 0.6 : 1.0;
		task.wait(boomerangDef.cooldown * cdMultiplier);

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
			const dmgMultiplier = activePlatformBuff === "damage" ? 1.5 : 1.0;
			const finalDamage = math.floor(boomerangDef.damage * dmgMultiplier);
			const count = boomerangDef.projectiles;
			for (let i = 0; i < count; i++) {
				const angleOffset = count > 1 ? (i === 0 ? -0.2 : 0.2) : 0;
				fireBoomerang(rootPart.Position, targetPos, finalDamage, boomerangDef.speed, angleOffset);
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
							VisualEffects.flashEnemy(enemy);

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
		const cdMultiplier = activePlatformBuff === "cooldown" ? 0.6 : 1.0;
		task.wait(plasmaDef.cooldown * cdMultiplier);

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
			const dmgMultiplier = activePlatformBuff === "damage" ? 1.5 : 1.0;
			const finalDamage = math.floor(plasmaDef.damage * dmgMultiplier);
			firePlasmaOrb(rootPart.Position, targetEnemy, finalDamage, plasmaDef.speed);
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
			VisualEffects.flashEnemy(targetEnemy);

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

							const dmgMultiplier = activePlatformBuff === "damage" ? 1.5 : 1.0;
							const finalOrbDmg = math.floor(orbitDef.damage * dmgMultiplier);
							const knockbackDir = enemy.Position.sub(hrp.Position).Unit;
							damageEvent?.FireServer(enemy, finalOrbDmg, knockbackDir);
							VisualEffects.showDamagePopup(enemy.Position, finalOrbDmg, true);
							VisualEffects.flashEnemy(enemy);

							const enemyHp = (enemy.GetAttribute("HP") as number) ?? 0;
							if (enemyHp - finalOrbDmg <= 0) {
								enemiesDefeatedCount++;
							}
						}
					}
				}
			}
		}
	});
});

// 10. Armas: Rayo Nova (Haz de energía desintegrador)
task.spawn(() => {
	while (true) {
		if (isClientPaused || isGameOver) {
			task.wait(0.2);
			continue;
		}

		const inventory = player.FindFirstChild("Inventory") as Folder;
		const novaLvl = (inventory?.FindFirstChild("nova_beam") as IntValue)?.Value ?? 0;

		if (novaLvl <= 0) {
			task.wait(1.0);
			continue;
		}

		const novaDef = WEAPONS.nova_beam.levels[math.min(novaLvl, WEAPONS.nova_beam.levels.size()) - 1];
		const cdMultiplier = activePlatformBuff === "cooldown" ? 0.6 : 1.0;
		task.wait(novaDef.cooldown * cdMultiplier);

		if (isClientPaused || isGameOver) continue;

		const char = player.Character;
		const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!hrp) continue;

		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (!enemiesFolder) continue;

		// Buscar enemigo más cercano para apuntar el haz
		let closestDist = 9999;
		let targetPos: Vector3 | undefined = undefined;

		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = hrp.Position.sub(enemy.Position).Magnitude;
				if (dist < closestDist && dist <= novaDef.range) {
					closestDist = dist;
					targetPos = enemy.Position;
				}
			}
		}

		if (targetPos) {
			const dmgMultiplier = activePlatformBuff === "damage" ? 1.5 : 1.0;
			const finalDamage = math.floor(novaDef.damage * dmgMultiplier);
			fireNovaBeam(hrp.Position, targetPos, finalDamage, novaDef.range, novaDef.duration ?? 0.5, novaDef.area);
		}
	}
});

function fireNovaBeam(startPos: Vector3, targetPos: Vector3, damage: number, maxRange: number, duration: number, beamScale: number) {
	const origin = startPos.add(new Vector3(0, 1.2, 0));
	const dir = targetPos.sub(origin).Unit;
	const endPos = origin.add(dir.mul(maxRange));
	const beamLength = maxRange;
	const centerPos = origin.add(dir.mul(beamLength / 2));

	// Cilindro de haz láser Neón
	const beamPart = new Instance("Part");
	beamPart.Name = "NovaBeamVisual";
	beamPart.Shape = Enum.PartType.Cylinder;
	beamPart.Size = new Vector3(beamLength, 1.8 * beamScale, 1.8 * beamScale);
	beamPart.CFrame = new CFrame(centerPos, endPos).mul(CFrame.Angles(0, math.rad(90), 0));
	beamPart.Material = Enum.Material.Neon;
	beamPart.Color = new Color3(1.0, 0.35, 0.1); // Naranja solar desintegrador
	beamPart.CanCollide = false;
	beamPart.Anchored = true;
	beamPart.Parent = Workspace;

	const light = new Instance("PointLight");
	light.Color = beamPart.Color;
	light.Range = 16;
	light.Brightness = 3;
	light.Parent = beamPart;

	// Dañar a todos los enemigos a lo largo de la línea del haz
	const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
	if (enemiesFolder) {
		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				// Distancia punto a recta del láser
				const v = enemy.Position.sub(origin);
				const projLength = v.Dot(dir);
				if (projLength >= 0 && projLength <= maxRange) {
					const closestPointOnLine = origin.add(dir.mul(projLength));
					const perpDist = enemy.Position.sub(closestPointOnLine).Magnitude;
					if (perpDist <= 3.5 * beamScale) {
						if (!damageEvent) {
							const net = Workspace.FindFirstChild("Network") as Folder;
							if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
						}
						damageEvent?.FireServer(enemy, damage, dir);
						VisualEffects.showDamagePopup(enemy.Position, damage, true);
						VisualEffects.flashEnemy(enemy);

						const enemyHp = (enemy.GetAttribute("HP") as number) ?? 0;
						if (enemyHp - damage <= 0) {
							enemiesDefeatedCount++;
						}
					}
				}
			}
		}
	}

	// Animación de desvanecimiento del rayo
	TweenService.Create(beamPart, new TweenInfo(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Transparency: 1,
		Size: new Vector3(beamLength, 0.1, 0.1),
	}).Play();

	Debris.AddItem(beamPart, duration + 0.05);
}

// 11. Loop de recolección/imantación de gemas hacia el jugador
RunService.Heartbeat.Connect((dt) => {
	if (isClientPaused || isGameOver) return;

	const character = player.Character;
	const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (!rootPart) return;

	const dropsFolder = Workspace.FindFirstChild("Drops") as Folder;
	if (!dropsFolder) return;

	const inventory = player.FindFirstChild("Inventory") as Folder;
	const magnetBonus = (inventory?.FindFirstChild("magnet_bonus") as NumberValue)?.Value ?? 0;
	const magnetRadius = 16 + magnetBonus;
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
					SoundManager.playGemSound();

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

// 12. Armas: Fulgor de Éter (Onda de choque radial de área continua)
task.spawn(() => {
	while (true) {
		if (isClientPaused || isGameOver) {
			task.wait(0.2);
			continue;
		}

		const inventory = player.FindFirstChild("Inventory") as Folder;
		const flareLvl = (inventory?.FindFirstChild("aether_flare") as IntValue)?.Value ?? 0;

		if (flareLvl <= 0) {
			task.wait(1.0);
			continue;
		}

		const flareDef = WEAPONS.aether_flare.levels[math.min(flareLvl, WEAPONS.aether_flare.levels.size()) - 1];
		const cdMultiplier = activePlatformBuff === "cooldown" ? 0.6 : 1.0;
		task.wait(flareDef.cooldown * cdMultiplier);

		if (isClientPaused || isGameOver) continue;

		const char = player.Character;
		const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!hrp) continue;

		const areaBonus = (inventory?.FindFirstChild("area_bonus") as NumberValue)?.Value ?? 0;
		const areaMultiplier = 1.0 + areaBonus;
		const effectiveRadius = flareDef.range * areaMultiplier;

		const dmgMultiplier = activePlatformBuff === "damage" ? 1.5 : 1.0;
		const finalDamage = math.floor(flareDef.damage * dmgMultiplier);

		fireAetherFlare(hrp.Position, effectiveRadius, finalDamage);
	}
});

function fireAetherFlare(centerPos: Vector3, radius: number, damage: number) {
	const spawnPos = new Vector3(centerPos.X, 0.25, centerPos.Z);

	// Anillo / Disco de choque radiante dorado Neón
	const shockwave = new Instance("Part");
	shockwave.Name = "AetherFlareVisual";
	shockwave.Shape = Enum.PartType.Cylinder;
	shockwave.Size = new Vector3(0.3, 2, 2);
	shockwave.CFrame = new CFrame(spawnPos).mul(CFrame.Angles(0, 0, math.rad(90)));
	shockwave.Material = Enum.Material.Neon;
	shockwave.Color = new Color3(1.0, 0.65, 0.1); // Ámbar solar radiante
	shockwave.Transparency = 0.3;
	shockwave.CanCollide = false;
	shockwave.Anchored = true;
	shockwave.Parent = Workspace;

	const light = new Instance("PointLight");
	light.Color = shockwave.Color;
	light.Range = radius * 0.8;
	light.Brightness = 4;
	light.Parent = shockwave;

	// Expansión y desvanecimiento
	const pulseTime = 0.38;
	TweenService.Create(shockwave, new TweenInfo(pulseTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size: new Vector3(0.15, radius * 2, radius * 2),
		Transparency: 1,
	}).Play();

	TweenService.Create(light, new TweenInfo(pulseTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Range: radius * 1.4,
		Brightness: 0,
	}).Play();

	Debris.AddItem(shockwave, pulseTime + 0.05);

	// Dañar a todos los enemigos dentro del radio del fulgor
	const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
	if (enemiesFolder) {
		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = centerPos.sub(enemy.Position).Magnitude;
				if (dist <= radius) {
					if (!damageEvent) {
						const net = Workspace.FindFirstChild("Network") as Folder;
						if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
					}
					const knockbackDir = enemy.Position.sub(centerPos).Unit;
					damageEvent?.FireServer(enemy, damage, knockbackDir);
					VisualEffects.showDamagePopup(enemy.Position, damage, true);
					VisualEffects.flashEnemy(enemy);

					const enemyHp = (enemy.GetAttribute("HP") as number) ?? 0;
					if (enemyHp - damage <= 0) {
						enemiesDefeatedCount++;
					}
				}
			}
		}
	}
}

// 13. Armas: Minas de Vórtice (Minas gravitatorias de implosión en área)
task.spawn(() => {
	while (true) {
		if (isClientPaused || isGameOver) {
			task.wait(0.2);
			continue;
		}

		const inventory = player.FindFirstChild("Inventory") as Folder;
		const mineLvl = (inventory?.FindFirstChild("vortex_mine") as IntValue)?.Value ?? 0;

		if (mineLvl <= 0) {
			task.wait(1.0);
			continue;
		}

		const mineDef = WEAPONS.vortex_mine.levels[math.min(mineLvl, WEAPONS.vortex_mine.levels.size()) - 1];
		const cdMultiplier = activePlatformBuff === "cooldown" ? 0.6 : 1.0;
		task.wait(mineDef.cooldown * cdMultiplier);

		if (isClientPaused || isGameOver) continue;

		const char = player.Character;
		const hrp = char?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!hrp) continue;

		const areaBonus = (inventory?.FindFirstChild("area_bonus") as NumberValue)?.Value ?? 0;
		const areaMultiplier = 1.0 + areaBonus;
		const dmgMultiplier = activePlatformBuff === "damage" ? 1.5 : 1.0;
		const finalDamage = math.floor(mineDef.damage * dmgMultiplier);
		const blastRadius = mineDef.range * areaMultiplier;
		const mineCount = mineDef.projectiles;

		for (let i = 0; i < mineCount; i++) {
			const angle = (i * (math.pi * 2 / mineCount)) + (math.random() - 0.5) * 0.8;
			const dropDist = 2.5 + math.random() * 2.5;
			const dropPos = new Vector3(
				hrp.Position.X + math.cos(angle) * dropDist,
				0.3,
				hrp.Position.Z + math.sin(angle) * dropDist,
			);
			deployVortexMine(dropPos, blastRadius, finalDamage);
		}
	}
});

function deployVortexMine(position: Vector3, blastRadius: number, damage: number) {
	// Part visual de la mina (Cuerpo de cuarzo oscuro + Esfera neón violeta)
	const mine = new Instance("Part");
	mine.Name = "VortexMineVisual";
	mine.Shape = Enum.PartType.Ball;
	mine.Size = new Vector3(1.2, 1.2, 1.2);
	mine.Position = position;
	mine.Material = Enum.Material.Neon;
	mine.Color = new Color3(0.65, 0.2, 0.95); // Púrpura cósmico
	mine.CanCollide = false;
	mine.Anchored = true;
	mine.Parent = Workspace;

	const light = new Instance("PointLight");
	light.Color = mine.Color;
	light.Range = 8;
	light.Brightness = 2.5;
	light.Parent = mine;

	// Anillo base de anclaje de la mina
	const ring = new Instance("Part");
	ring.Name = "MineBase";
	ring.Shape = Enum.PartType.Cylinder;
	ring.Size = new Vector3(0.15, 2.0, 2.0);
	ring.CFrame = new CFrame(position.sub(new Vector3(0, 0.2, 0))).mul(CFrame.Angles(0, 0, math.rad(90)));
	ring.Material = Enum.Material.DiamondPlate;
	ring.Color = new Color3(0.15, 0.1, 0.2);
	ring.CanCollide = false;
	ring.Anchored = true;
	ring.Parent = mine;

	// Monitorear activación por proximidad
	task.spawn(() => {
		task.wait(0.35); // Tiempo de armado
		if (!mine.Parent) return;

		let detonated = false;
		const triggerRadius = 5.0;
		const maxLifetime = 14.0;
		const mineStartTime = os.clock();

		while (!detonated && mine.Parent && os.clock() - mineStartTime < maxLifetime) {
			task.wait(0.08);
			if (isClientPaused || isGameOver) continue;

			const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
			if (enemiesFolder) {
				for (const enemy of enemiesFolder.GetChildren()) {
					if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
						const dist = position.sub(enemy.Position).Magnitude;
						if (dist <= triggerRadius) {
							detonated = true;
							break;
						}
					}
				}
			}
		}

		if (mine.Parent) {
			detonateVortexMine(position, blastRadius, damage);
			mine.Destroy();
		}
	});
}

function detonateVortexMine(position: Vector3, radius: number, damage: number) {
	// Efecto de Implosión Gravitatoria y Onda expansiva de Vacío
	const vortex = new Instance("Part");
	vortex.Name = "VortexDetonation";
	vortex.Shape = Enum.PartType.Ball;
	vortex.Size = new Vector3(0.5, 0.5, 0.5);
	vortex.Position = position;
	vortex.Material = Enum.Material.Neon;
	vortex.Color = new Color3(0.75, 0.25, 1.0); // Violeta vórtice
	vortex.Transparency = 0.2;
	vortex.CanCollide = false;
	vortex.Anchored = true;
	vortex.Parent = Workspace;

	const pulseDuration = 0.45;
	TweenService.Create(vortex, new TweenInfo(pulseDuration, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Size: new Vector3(radius * 2, radius * 2, radius * 2),
		Transparency: 1,
	}).Play();

	Debris.AddItem(vortex, pulseDuration + 0.05);

	// Onda plana expansiva
	const shockwave = new Instance("Part");
	shockwave.Name = "VortexRing";
	shockwave.Shape = Enum.PartType.Cylinder;
	shockwave.Size = new Vector3(0.2, 1, 1);
	shockwave.CFrame = new CFrame(position).mul(CFrame.Angles(0, 0, math.rad(90)));
	shockwave.Material = Enum.Material.Neon;
	shockwave.Color = new Color3(0.5, 0.1, 0.9);
	shockwave.Transparency = 0.3;
	shockwave.CanCollide = false;
	shockwave.Anchored = true;
	shockwave.Parent = Workspace;

	TweenService.Create(shockwave, new TweenInfo(pulseDuration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size: new Vector3(0.1, radius * 2.2, radius * 2.2),
		Transparency: 1,
	}).Play();

	Debris.AddItem(shockwave, pulseDuration + 0.05);

	// Dañar y atraer levemente a los enemigos en el radio de la implosión
	const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
	if (enemiesFolder) {
		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = position.sub(enemy.Position).Magnitude;
				if (dist <= radius) {
					if (!damageEvent) {
						const net = Workspace.FindFirstChild("Network") as Folder;
						if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
					}

					// Knockback dir hacia el centro (efecto vórtice / succión gravitatoria)
					const pullDir = position.sub(enemy.Position).Unit;
					damageEvent?.FireServer(enemy, damage, pullDir.mul(1.2));
					VisualEffects.showDamagePopup(enemy.Position, damage, true);
					VisualEffects.flashEnemy(enemy);

					const enemyHp = (enemy.GetAttribute("HP") as number) ?? 0;
					if (enemyHp - damage <= 0) {
						enemiesDefeatedCount++;
					}
				}
			}
		}
	}
}
