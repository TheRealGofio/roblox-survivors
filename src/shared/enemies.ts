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
		name: "Zombie Chatarrero (TDS)",
		behavior: "melee",
		hp: 40,
		speed: 8.5,
		damage: 10,
		xpValue: 10,
		size: new Vector3(3.2, 4.3, 3.2),
		color: new Color3(0.29, 0.59, 0.29), // Verde zombie
		material: Enum.Material.SmoothPlastic,
	},
	skimmer: {
		id: "skimmer",
		name: "Planeador Espacial",
		behavior: "fast",
		hp: 25,
		speed: 13.5,
		damage: 8,
		xpValue: 15,
		size: new Vector3(2.4, 2.2, 2.4),
		color: new Color3(1.0, 0.65, 0.1), // Naranja solar
		material: Enum.Material.SmoothPlastic,
	},
	brute: {
		id: "brute",
		name: "Bruto Blindado",
		behavior: "tank",
		hp: 180,
		speed: 5.5,
		damage: 22,
		xpValue: 45,
		size: new Vector3(4.2, 4.8, 4.2),
		color: new Color3(0.18, 0.75, 0.3), // Verde esmeralda acorazado
		material: Enum.Material.SmoothPlastic,
	},
	turret: {
		id: "turret",
		name: "Centinela Acechador",
		behavior: "shooter",
		hp: 60,
		speed: 6.5,
		damage: 12,
		xpValue: 25,
		size: new Vector3(2.4, 3.6, 2.4),
		color: new Color3(0.08, 0.75, 0.95), // Turquesa eléctrico
		material: Enum.Material.SmoothPlastic,
		shootCooldown: 3.2,
		projectileSpeed: 28,
	},
	obsidian_colossus: {
		id: "obsidian_colossus",
		name: "Coloso de Obsidiana (Boss)",
		behavior: "boss",
		hp: 750, // Jefe Oleada 5
		speed: 7.0,
		damage: 28,
		xpValue: 150,
		size: new Vector3(5.5, 6.5, 5.5),
		color: new Color3(0.12, 0.10, 0.18), // Obsidiana oscura
		material: Enum.Material.SmoothPlastic,
		shootCooldown: 2.5,
		projectileSpeed: 30,
		isBoss: true,
	},
	void_harvester: {
		id: "void_harvester",
		name: "Cosechador del Vacío (Boss)",
		behavior: "boss",
		hp: 1200, // Jefe Oleada 10
		speed: 7.5,
		damage: 35,
		xpValue: 250,
		size: new Vector3(6.0, 7.0, 6.0),
		color: new Color3(0.35, 0.08, 0.5), // Púrpura del vacío
		material: Enum.Material.SmoothPlastic,
		shootCooldown: 2.0,
		projectileSpeed: 32,
		isBoss: true,
	},
	aether_sovereign: {
		id: "aether_sovereign",
		name: "Soberano del Éter (Boss)",
		behavior: "boss",
		hp: 1800, // Jefe Oleada 15
		speed: 8.0,
		damage: 42,
		xpValue: 400,
		size: new Vector3(6.5, 7.5, 6.5),
		color: new Color3(0.1, 0.85, 0.95), // Éter celeste
		material: Enum.Material.SmoothPlastic,
		shootCooldown: 1.8,
		projectileSpeed: 35,
		isBoss: true,
	},
	// Alias de retrocompatibilidad
	overlord_boss: {
		id: "overlord_boss",
		name: "Coloso de Obsidiana (Boss)",
		behavior: "boss",
		hp: 750,
		speed: 7.0,
		damage: 28,
		xpValue: 150,
		size: new Vector3(5.5, 6.5, 5.5),
		color: new Color3(0.12, 0.10, 0.18),
		material: Enum.Material.SmoothPlastic,
		shootCooldown: 2.5,
		projectileSpeed: 30,
		isBoss: true,
	},
};
