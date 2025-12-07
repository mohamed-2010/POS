import { IndexedDBClient } from "./IndexedDBClient";
import { IndexedDBRepository } from "./IndexedDBRepository";
import { MigrationRunner } from "./migrations/MigrationRunner";
import { SeederRunner } from "./seeders/SeederRunner";
import { migration_v5 } from "./migrations/v5-shift-purchase-returns";
import { UserSeeder } from "./seeders/UserSeeder";
import { RoleSeeder } from "./seeders/RoleSeeder";
import { SettingsSeeder } from "./seeders/SettingsSeeder";

/**
 * DatabaseService - Facade pattern للوصول لقاعدة البيانات
 * Single Responsibility: تنسيق بين المكونات المختلفة
 */
export class DatabaseService {
  private client: IndexedDBClient;
  private migrationRunner: MigrationRunner;
  private seederRunner: SeederRunner;
  private repositories: Map<string, IndexedDBRepository> = new Map();

  constructor(dbName: string = "MASRPOS", dbVersion: number = 14) {
    this.client = new IndexedDBClient({ name: dbName, version: dbVersion });
    this.migrationRunner = new MigrationRunner();
    this.seederRunner = new SeederRunner(this.client);

    // Register migrations
    this.registerMigrations();

    // Register seeders
    this.registerSeeders();
  }

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    await this.client.init((db, event) => {
      this.migrationRunner.run(db, event);
    });

    // Run seeders after initialization
    await this.seederRunner.runAll();

    console.log("✅ Database initialized successfully");
  }

  /**
   * Reset database
   */
  async reset(): Promise<void> {
    await this.client.reset((db, event) => {
      this.migrationRunner.run(db, event);
    });

    // Run seeders after reset
    await this.seederRunner.runAll();

    console.log("✅ Database reset successfully");
  }

  /**
   * Get repository for a store
   */
  getRepository<T = any>(storeName: string): IndexedDBRepository<T> {
    if (!this.repositories.has(storeName)) {
      this.repositories.set(
        storeName,
        new IndexedDBRepository<T>(this.client, storeName)
      );
    }
    return this.repositories.get(storeName) as IndexedDBRepository<T>;
  }

  /**
   * Get client (for advanced operations)
   */
  getClient(): IndexedDBClient {
    return this.client;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.client.isInitialized();
  }

  /**
   * Register all migrations
   */
  private registerMigrations(): void {
    this.migrationRunner.register(migration_v5);
    // Add more migrations here as needed
  }

  /**
   * Register all seeders
   */
  private registerSeeders(): void {
    this.seederRunner.register(new UserSeeder());
    this.seederRunner.register(new RoleSeeder());
    this.seederRunner.register(new SettingsSeeder());
    // Add more seeders here as needed
  }
}

// Singleton instance
let databaseServiceInstance: DatabaseService | null = null;

/**
 * Get DatabaseService singleton instance
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new DatabaseService();
  }
  return databaseServiceInstance;
}

/**
 * Initialize database (convenience function)
 */
export async function initializeDatabase(): Promise<DatabaseService> {
  const service = getDatabaseService();
  if (!service.isInitialized()) {
    await service.initialize();
  }
  return service;
}
