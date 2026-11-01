export interface EnemyTypeConfig {
	id: string;
	name: string;
	behavior: "melee" | "fast" | "tank" | "shooter" | "boss";
	hp: number;
	speed: number;
	damage: number;
	xpValue: number;
	size: Vector3;
	color: Color3;
	material: Enum.Material;
	modelName?: string;
	shootCooldown?: number;
	projectileSpeed?: number;
	isBoss?: boolean;
}

export const ENEMY_TYPES: Record<string, EnemyTypeConfig> = {
	crawler: {
		id: "crawler",
		name: "Rastreador de Chatarra",
		behavior: "melee",
		hp: 40,
		speed: 8.5,
		damage: 10,
		xpValue: 10,
		size: new Vector3(3.2, 4.0, 3.2),
		color: new Color3(0.2, 0.85, 0.3),
		material: Enum.Material.Neon,
		modelName: "GreenSpikyBlob",
	},
	skimmer: {
		id: "skimmer",
		name: "Deslizador Víbora",
		behavior: "fast",
		hp: 25,
		speed: 13.5,
		damage: 8,
		xpValue: 15,
		size: new Vector3(3.0, 2.5, 2.0),
		color: new Color3(1.0, 0.65, 0.1),
		material: Enum.Material.Neon,
		modelName: "Birb",
	},
	brute: {
		id: "brute",
		name: "Bruto Goliat",
		behavior: "tank",
		hp: 180,
		speed: 5.5,
		damage: 22,
		xpValue: 45,
		size: new Vector3(4.5, 4.5, 3.0),
		color: new Color3(0.85, 0.2, 0.2),
		material: Enum.Material.Neon,
		modelName: "Demon",
	},
	turret: {
		id: "turret",
		name: "Centinela Acechador",
		behavior: "shooter",
		hp: 60,
		speed: 6.5,
		damage: 12,
		xpValue: 25,
		size: new Vector3(2.5, 3.8, 2.5),
		color: new Color3(0.05, 0.8, 0.95),
		material: Enum.Material.Neon,
		modelName: "Wizard",
		shootCooldown: 3.2,
		projectileSpeed: 28,
	},
	overlord_boss: {
		id: "overlord_boss",
		name: "SEÑOR DEL VACÍO (BOSS)",
		behavior: "boss",
		hp: 750, // Jefe colosal
		speed: 7.0,
		damage: 28,
		xpValue: 150,
		size: new Vector3(6.0, 4.0, 4.5),
		color: new Color3(0.9, 0.8, 0.1),
		material: Enum.Material.Neon,
		modelName: "Alpaking",
		shootCooldown: 2.5,
		projectileSpeed: 30,
		isBoss: true,
	},
};
