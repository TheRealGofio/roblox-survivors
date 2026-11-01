-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local SoundService = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services").SoundService
local SoundManager = {}
do
	local _container = SoundManager
	-- Catálogo de SFX con IDs de Roblox oficiales / abiertos
	local SFX_IDS = {
		gemPickup = "rbxassetid://9069609204",
		levelUp = "rbxassetid://9069609204",
		playerHit = "rbxassetid://9114223171",
		dash = "rbxassetid://9114221580",
		laserShoot = "rbxassetid://9114221160",
		enemyHit = "rbxassetid://9114223171",
		gameOver = "rbxassetid://9069609204",
	}
	local soundFolder = SoundService:FindFirstChild("GameSounds")
	if not soundFolder then
		soundFolder = Instance.new("Folder")
		soundFolder.Name = "GameSounds"
		soundFolder.Parent = SoundService
	end
	local function playSound(soundKey, volume, playbackSpeed)
		if volume == nil then
			volume = 0.5
		end
		if playbackSpeed == nil then
			playbackSpeed = 1.0
		end
		local assetId = SFX_IDS[soundKey]
		if not (assetId ~= "" and assetId) then
			return nil
		end
		local sound = Instance.new("Sound")
		sound.SoundId = assetId
		sound.Volume = volume
		sound.PlaybackSpeed = playbackSpeed
		sound.RollOffMaxDistance = 100
		sound.Parent = soundFolder
		sound:Play()
		sound.Ended:Connect(function()
			sound:Destroy()
		end)
		-- Seguridad de limpieza
		task.delay(4, function()
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
		local pitch = if pitchVariance then 0.9 + math.random() * 0.25 else 1.0
		playSound("enemyHit", 0.35, pitch)
	end
	_container.playHitSound = playHitSound
	local function playGemSound()
		playSound("gemPickup", 0.45, 1.2 + math.random() * 0.2)
	end
	_container.playGemSound = playGemSound
	local function playDashSound()
		playSound("dash", 0.65, 1.1)
	end
	_container.playDashSound = playDashSound
	local function playLevelUpSound()
		playSound("levelUp", 0.75, 0.9)
	end
	_container.playLevelUpSound = playLevelUpSound
	local function playLaserShootSound()
		playSound("laserShoot", 0.3, 1.1 + math.random() * 0.15)
	end
	_container.playLaserShootSound = playLaserShootSound
end
return {
	SoundManager = SoundManager,
}
