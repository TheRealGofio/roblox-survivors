import { Debris, TweenService, Workspace } from "@rbxts/services";

export namespace VisualEffects {
	export function showDamagePopup(position: Vector3, damage: number, isCritical = false) {
		const part = new Instance("Part");
		part.Size = new Vector3(0.1, 0.1, 0.1);
		part.Transparency = 1;
		part.CanCollide = false;
		part.Anchored = true;
		part.CFrame = new CFrame(position.add(new Vector3((math.random() - 0.5) * 1.5, 1.5, (math.random() - 0.5) * 1.5)));
		part.Parent = Workspace;

		const billboard = new Instance("BillboardGui");
		billboard.Size = new UDim2(0, 100, 0, 40);
		billboard.AlwaysOnTop = true;
		billboard.Adornee = part;
		billboard.Parent = part;

		const label = new Instance("TextLabel");
		label.Size = new UDim2(1, 0, 1, 0);
		label.BackgroundTransparency = 1;
		label.Font = Enum.Font.FredokaOne;
		label.Text = `${math.round(damage)}`;
		label.TextSize = isCritical ? 24 : 18;
		label.TextColor3 = isCritical ? new Color3(1, 0.85, 0.1) : new Color3(1, 1, 1);
		label.TextStrokeTransparency = 0;
		label.TextStrokeColor3 = new Color3(0, 0, 0);
		label.Parent = billboard;

		// Animación hacia arriba y fade out
		const tweenInfo = new TweenInfo(0.65, Enum.EasingStyle.Back, Enum.EasingDirection.Out);
		const tween = TweenService.Create(part, tweenInfo, {
			CFrame: part.CFrame.add(new Vector3(0, 2.5, 0)),
		});
		tween.Play();

		Debris.AddItem(part, 0.7);
	}
}
