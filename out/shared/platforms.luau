-- Compiled with roblox-ts v3.0.0
local TACTICAL_PLATFORMS = { {
	id = "heal_sanctuary",
	name = "Santuario de Salud",
	title = "BASTIÓN NORTE",
	position = Vector3.new(0, 0.2, 45),
	radius = 12,
	buffType = "heal",
	buffName = "Regeneración Vital",
	buffDesc = "+8 HP por segundo",
	color = Color3.new(0.1, 0.9, 0.4),
}, {
	id = "damage_overload",
	name = "Pilar de Sobrecarga",
	title = "BASTIÓN SUROESTE",
	position = Vector3.new(-55, 0.2, -35),
	radius = 12,
	buffType = "damage",
	buffName = "Sobrecarga de Plasma",
	buffDesc = "+50% de Daño en todas las armas",
	color = Color3.new(1.0, 0.25, 0.15),
}, {
	id = "haste_vortex",
	name = "Vórtice Acelerador",
	title = "BASTIÓN SURESTE",
	position = Vector3.new(55, 0.2, -35),
	radius = 12,
	buffType = "cooldown",
	buffName = "Hipercronía",
	buffDesc = "-40% de Cooldown en ataques",
	color = Color3.new(0.1, 0.8, 1.0),
} }
return {
	TACTICAL_PLATFORMS = TACTICAL_PLATFORMS,
}
