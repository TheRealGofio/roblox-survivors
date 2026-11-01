-- Compiled with roblox-ts v3.0.0
local WEAPONS = {
	void_boomerang = {
		id = "void_boomerang",
		name = "Búmeran del Vacío",
		type = "boomerang",
		description = "Lanza cuchillas lunares que perforan enemigos de ida y vuelta.",
		levels = { {
			level = 1,
			damage = 25,
			cooldown = 1.5,
			projectiles = 1,
			range = 40,
			speed = 35,
			area = 1.0,
			pierce = 999,
			description = "1 búmeran perforante.",
		}, {
			level = 2,
			damage = 35,
			cooldown = 1.3,
			projectiles = 2,
			range = 45,
			speed = 38,
			area = 1.2,
			pierce = 999,
			description = "2 búmeranes con más alcance.",
		} },
	},
	plasma_blaster = {
		id = "plasma_blaster",
		name = "Bláster de Plasma",
		type = "projectile",
		description = "Disparos directos al enemigo más cercano.",
		levels = { {
			level = 1,
			damage = 18,
			cooldown = 0.8,
			projectiles = 1,
			range = 50,
			speed = 60,
			area = 1.0,
			pierce = 1,
			description = "Disparo rápido teledirigido.",
		} },
	},
}
return {
	WEAPONS = WEAPONS,
}
