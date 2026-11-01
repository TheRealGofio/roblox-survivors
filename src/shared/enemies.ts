export interface EnemyTypeConfig {
	id: string;
	name: string;
	behavior: "melee" | "fast" | "tank" | "shooter";
	hp: number;
	speed: number;
	damage: number;
	xpValue: number;
	size: Vector3;
	color: Color3;
	material: Enum.Material;
	shootCooldown?: number;
	projectileSpeed?: number;
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
		size: new Vector3(3, 3, 3),
		color: new Color3(0.95, 0.2, 0.25), // Carmesí neón
		material: Enum.Material.Neon,
	},
	skimmer: {
		id: "skimmer",
		name: "Deslizador Víbora",
		behavior: "fast",
		hp: 25,
		speed: 13.5, // 60% más veloz
		damage: 8,
		xpValue: 15,
		size: new Vector3(2, 1.6, 2), // Más pequeño y aplanado
		color: new Color3(1.0, 0.65, 0.1), // Ámbar neón
		material: Enum.Material.Neon,
	},
	brute: {
		id: "brute",
		name: "Bruto Goliat",
		behavior: "tank",
		hp: 180, // Tanque resistente
		speed: 5.5, // Lento
		damage: 22,
		xpValue: 45, // Suelta mucha experiencia
		size: new Vector3(5, 5, 5), // Colosal
		color: new Color3(0.55, 0.15, 0.95), // Púrpura neón
		material: Enum.Material.Neon,
	},
	turret: {
		id: "turret",
		name: "Centinela Acechador",
		behavior: "shooter",
		hp: 60,
		speed: 6.5,
		damage: 12,
		xpValue: 25,
		size: new Vector3(2.6, 3.8, 2.6), // Forma de torre
		color: new Color3(0.05, 0.8, 0.95), // Cian eléctrico
		material: Enum.Material.Neon,
		shootCooldown: 3.2,
		projectileSpeed: 28,
	},
};
