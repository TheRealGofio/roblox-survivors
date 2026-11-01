export interface WeaponLevelDef {
	level: number;
	damage: number;
	cooldown: number;
	projectiles: number;
	range: number;
	speed: number;
	area: number;
	pierce: number;
	description: string;
}

export interface WeaponDef {
	id: string;
	name: string;
	type: string;
	description: string;
	levels: WeaponLevelDef[];
}

export interface UpgradeOption {
	id: string;
	title: string;
	type: "weapon_upgrade" | "new_weapon" | "passive";
	description: string;
	iconName?: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
	void_boomerang: {
		id: "void_boomerang",
		name: "Búmeran del Vacío",
		type: "boomerang",
		description: "Lanza cuchillas lunares que perforan enemigos de ida y vuelta.",
		levels: [
			{
				level: 1,
				damage: 25,
				cooldown: 1.5,
				projectiles: 1,
				range: 40,
				speed: 35,
				area: 1.0,
				pierce: 999,
				description: "1 búmeran perforante.",
			},
			{
				level: 2,
				damage: 38,
				cooldown: 1.25,
				projectiles: 1,
				range: 48,
				speed: 40,
				area: 1.2,
				pierce: 999,
				description: "+50% daño y mayor velocidad de vuelo.",
			},
			{
				level: 3,
				damage: 52,
				cooldown: 1.0,
				projectiles: 2,
				range: 55,
				speed: 45,
				area: 1.4,
				pierce: 999,
				description: "Dispara 2 búmeranes simultáneos y reduce cooldown.",
			},
		],
	},
	plasma_blaster: {
		id: "plasma_blaster",
		name: "Bláster de Plasma",
		type: "projectile",
		description: "Ráfagas rápidas de energía de plasma teledirigidas.",
		levels: [
			{
				level: 1,
				damage: 20,
				cooldown: 0.7,
				projectiles: 1,
				range: 50,
				speed: 65,
				area: 1.0,
				pierce: 1,
				description: "Proyectil de plasma rápido teledirigido.",
			},
			{
				level: 2,
				damage: 28,
				cooldown: 0.55,
				projectiles: 2,
				range: 55,
				speed: 70,
				area: 1.0,
				pierce: 1,
				description: "Dispara 2 esferas de plasma a la vez.",
			},
		],
	},
};
