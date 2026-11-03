-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local TweenService = _services.TweenService
local Workspace = _services.Workspace
local VisualEffects = {}
do
	local _container = VisualEffects
	local function showDamagePopup(position, damage, isCritical)
		if isCritical == nil then
			isCritical = false
		end
		local part = Instance.new("Part")
		part.Size = Vector3.new(0.1, 0.1, 0.1)
		part.Transparency = 1
		part.CanCollide = false
		part.Anchored = true
		local _position = position
		local _vector3 = Vector3.new((math.random() - 0.5) * 1.5, 1.5, (math.random() - 0.5) * 1.5)
		part.CFrame = CFrame.new(_position + _vector3)
		part.Parent = Workspace
		local billboard = Instance.new("BillboardGui")
		billboard.Size = UDim2.new(0, 100, 0, 40)
		billboard.AlwaysOnTop = true
		billboard.Adornee = part
		billboard.Parent = part
		local label = Instance.new("TextLabel")
		label.Size = UDim2.new(1, 0, 1, 0)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.FredokaOne
		label.Text = `{math.round(damage)}`
		label.TextSize = if isCritical then 24 else 18
		label.TextColor3 = if isCritical then Color3.new(1, 0.85, 0.1) else Color3.new(1, 1, 1)
		label.TextStrokeTransparency = 0
		label.TextStrokeColor3 = Color3.new(0, 0, 0)
		label.Parent = billboard
		-- Animación hacia arriba y fade out
		local tweenInfo = TweenInfo.new(0.65, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
		local _object = {}
		local _left = "CFrame"
		local _cFrame = part.CFrame
		local _vector3_1 = Vector3.new(0, 2.5, 0)
		_object[_left] = _cFrame + _vector3_1
		local tween = TweenService:Create(part, tweenInfo, _object)
		tween:Play()
		Debris:AddItem(part, 0.7)
	end
	_container.showDamagePopup = showDamagePopup
	local function showHealPopup(position, healAmount)
		local part = Instance.new("Part")
		part.Size = Vector3.new(0.1, 0.1, 0.1)
		part.Transparency = 1
		part.CanCollide = false
		part.Anchored = true
		local _position = position
		local _vector3 = Vector3.new((math.random() - 0.5) * 1.0, 2.0, (math.random() - 0.5) * 1.0)
		part.CFrame = CFrame.new(_position + _vector3)
		part.Parent = Workspace
		local billboard = Instance.new("BillboardGui")
		billboard.Size = UDim2.new(0, 100, 0, 40)
		billboard.AlwaysOnTop = true
		billboard.Adornee = part
		billboard.Parent = part
		local label = Instance.new("TextLabel")
		label.Size = UDim2.new(1, 0, 1, 0)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.FredokaOne
		label.Text = `+{math.round(healAmount)} HP`
		label.TextSize = 20
		label.TextColor3 = Color3.new(0.2, 1.0, 0.4)
		label.TextStrokeTransparency = 0
		label.TextStrokeColor3 = Color3.new(0.05, 0.2, 0.08)
		label.Parent = billboard
		local tweenInfo = TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
		local _object = {}
		local _left = "CFrame"
		local _cFrame = part.CFrame
		local _vector3_1 = Vector3.new(0, 2.8, 0)
		_object[_left] = _cFrame + _vector3_1
		local tween = TweenService:Create(part, tweenInfo, _object)
		tween:Play()
		Debris:AddItem(part, 0.85)
	end
	_container.showHealPopup = showHealPopup
	local function flashEnemy(enemy)
		local visualModel = enemy:FindFirstChild("VisualModel")
		if not visualModel then
			return nil
		end
		local hl = visualModel:FindFirstChild("HitFlashHighlight")
		if not hl then
			hl = Instance.new("Highlight")
			hl.Name = "HitFlashHighlight"
			hl.FillColor = Color3.new(1, 1, 1)
			hl.OutlineTransparency = 1
			hl.FillTransparency = 0.25
			hl.Adornee = visualModel
			hl.Parent = visualModel
		end
		task.delay(0.08, function()
			if hl and hl.Parent then
				hl:Destroy()
			end
		end)
	end
	_container.flashEnemy = flashEnemy
end
return {
	VisualEffects = VisualEffects,
}
