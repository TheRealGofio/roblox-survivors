-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local SoundService = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services").SoundService
local SoundManager = {}
do
	local _container = SoundManager
	-- 1. Sonidos nativos locales infalibles de Roblox (vienen preinstalados en el cliente de Roblox)
	-- rbxasset://sounds/... nunca falla por permisos ni necesita descarga online
	local BUILTIN_SOUNDS = {
		gemPickup = "rbxasset://sounds/electronicpingshort.wav",
		levelUp = "rbxasset://sounds/victory.wav",
		playerHit = "rbxasset://sounds/ouch.wav",
		dash = "rbxasset://sounds/action_jump.mp3",
		enemyHit = "rbxasset://sounds/hit.wav",
		laserShoot = "rbxasset://sounds/button.wav",
	}
	local soundFolder = SoundService:FindFirstChild("GameSounds")
	if not soundFolder then
		soundFolder = Instance.new("Folder")
		soundFolder.Name = "GameSounds"
		soundFolder.Parent = SoundService
	end
	local function playSound(soundKey, volume, playbackSpeed)
		if volume == nil then
			volume = 0.6
		end
		if playbackSpeed == nil then
			playbackSpeed = 1.0
		end
		local assetUrl = BUILTIN_SOUNDS[soundKey]
		if not (assetUrl ~= "" and assetUrl) then
			return nil
		end
		local sound = Instance.new("Sound")
		sound.SoundId = assetUrl
		sound.Volume = volume
		sound.PlaybackSpeed = playbackSpeed
		sound.Parent = soundFolder
		sound:Play()
		sound.Ended:Connect(function()
			sound:Destroy()
		end)
		task.delay(3, function()
			if sound and sound.Parent then
				sound:Destroy()
			end
		end)
	end
	_container.playSound = playSound
	local function playHitSound(pitchVariance)
		if pitchVariance == nil then
			pitchVariance = true
		end
		local pitch = if pitchVariance then 1.0 + math.random() * 0.3 else 1.1
		playSound("enemyHit", 0.5, pitch)
	end
	_container.playHitSound = playHitSound
	local function playGemSound()
		playSound("gemPickup", 0.5, 1.4 + math.random() * 0.2)
	end
	_container.playGemSound = playGemSound
	local function playDashSound()
		playSound("dash", 0.7, 1.2)
	end
	_container.playDashSound = playDashSound
	local function playLevelUpSound()
		playSound("levelUp", 0.8, 1.0)
	end
	_container.playLevelUpSound = playLevelUpSound
end
return {
	SoundManager = SoundManager,
}
