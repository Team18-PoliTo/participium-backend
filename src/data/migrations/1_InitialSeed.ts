import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";

export class InitialSeed1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Offices (Uffici)
    await queryRunner.query(
      `INSERT INTO offices (id, name, description) VALUES 
      (1, 'Organization Office', 'Ufficio Organizzativo'),
      (2, 'Street Maintenance Office', 'Ufficio Manutenzione Stradale'),
      (3, 'Public Lighting Office', 'Ufficio Illuminazione Pubblica'),
      (4, 'Waste Management Office', 'Ufficio Gestione Rifiuti'),
      (5, 'Urban Mobility Office', 'Ufficio Mobilità Urbana'),
      (6, 'Green Spaces Office', 'Ufficio Spazi Verdi'),
      (7, 'Water Infrastructure Office', 'Ufficio Infrastrutture Idriche'),
      (8, 'Accessibility Office', 'Ufficio Accessibilità')`
    );

    // Insert Roles (Ruoli)
    // Note: Roles 0 and 1 are system roles (Unassigned and ADMIN), not tied to offices
    await queryRunner.query(
      `INSERT INTO roles (id, role, officeId) VALUES 
      (0, 'Unassigned', NULL),
      (1, 'ADMIN', NULL),
      (10, 'Public Relations Officer', 1),
      (11, 'Street Maintenance Operator', 2),
      (12, 'Public Lighting Operator', 3),
      (13, 'Waste Management Operator', 4),
      (14, 'Urban Mobility Operator', 5),
      (15, 'Green Spaces Operator', 6),
      (16, 'Water Infrastructure Operator', 7),
      (17, 'Accessibility Officer', 8),
      (18, 'Environmental Surveillance Officer', 4),
      (19, 'Road Safety Inspector', 2),
      (20, 'Public Lighting Technician', 3),
      (21, 'Urban Mobility Planner', 5),
      (22, 'Green Maintenance Technician', 6),
      (23, 'Water Quality Inspector', 7),
      (24, 'Accessibility Inspector', 8),
      (25, 'Digital Services Technician', 1),
      (26, 'Emergency Response Liaison', 1),
      (27, 'Noise and Air Quality Technician', 7)`
    );

    // Insert Categories (Categorie)
    await queryRunner.query(
      `INSERT INTO categories (id, name, description) VALUES 
      (1, 'Water Supply – Drinking Water', 'Fornitura di Acqua - Acqua Potabile'),
      (2, 'Architectural Barriers', 'Barriere Architettoniche'),
      (3, 'Sewer System', 'Sistema Fognario'),
      (4, 'Public Lighting', 'Illuminazione Pubblica'),
      (5, 'Waste', 'Rifiuti'),
      (6, 'Road Signs and Traffic Lights', 'Segnaletica Stradale e Semafori'),
      (7, 'Roads and Urban Furnishings', 'Strade e Arredi Urbani'),
      (8, 'Public Green Areas and Playgrounds', 'Aree Verdi Pubbliche e Parchi Giochi'),
      (9, 'Illegal Dumping', 'Rifiuti abbandonati illegalmente'),
      (10, 'Road Potholes', 'Buche e dissesti sulla carreggiata'),
      (11, 'Street Cleaning', 'Problemi di pulizia stradale'),
      (12, 'Air Quality Issues', 'Problemi di qualità dell’aria'),
      (13, 'Noise Disturbance', 'Rumori molesti o eccessivi'),
      (14, 'Broken Street Furniture', 'Danni ad arredi urbani'),
      (15, 'Water Leakage', 'Perdita o dispersione d’acqua'),
      (16, 'Traffic Congestion', 'Congestione o problemi di traffico'),
      (17, 'Flooding or Drainage Issues', 'Allagamenti o scarso drenaggio'),
      (18, 'Public Park Damage', 'Danni in aree verdi o parchi')`
    );

    // Insert Category-Role relationships (one-to-many)
    // Note: Public Relations Officer (roleId 10) does not handle specific categories
    // System roles 0 (Unassigned) and 1 (ADMIN) are not mapped to categories
    await queryRunner.query(
      `INSERT INTO category_roles (id, categoryId, roleId) VALUES 
      (1, 1, 16),
      (2, 3, 16),
      (3, 2, 17),
      (4, 4, 12),
      (5, 5, 13),
      (6, 6, 14),
      (7, 7, 11),
      (8, 8, 15),
      (9, 9, 18),
      (10, 10, 19),
      (11, 11, 11),  
      (12, 11, 18),  
      (13, 12, 27),
      (14, 13, 27),
      (15, 14, 11),
      (16, 15, 23),
      (17, 16, 21),
      (18, 17, 23),
      (19, 18, 22)`
    );

    // Insert Initial Admin User and Internal Users for each technical role
    const hashedPassword = await bcrypt.hash("password123", 10);

    const internalUsers = [
      { email: "admin@participium.com", firstName: "Admin", lastName: "User", roleId: 1 },
      { email: "marco.rossi@participium.com", firstName: "Marco", lastName: "Rossi", roleId: 10 },
      { email: "giovanni.ferrari@participium.com", firstName: "Giovanni", lastName: "Ferrari", roleId: 11 },
      { email: "luigi.bianchi@participium.com", firstName: "Luigi", lastName: "Bianchi", roleId: 12 },
      { email: "francesco.rizzo@participium.com", firstName: "Francesco", lastName: "Rizzo", roleId: 13 },
      { email: "antonio.russo@participium.com", firstName: "Antonio", lastName: "Russo", roleId: 14 },
      { email: "paolo.moretti@participium.com", firstName: "Paolo", lastName: "Moretti", roleId: 15 },
      { email: "andrea.romano@participium.com", firstName: "Andrea", lastName: "Romano", roleId: 16 },
      { email: "matteo.colombo@participium.com", firstName: "Matteo", lastName: "Colombo", roleId: 17 },
    ];

    for (const user of internalUsers) {
      await queryRunner.query(
        `INSERT INTO "internal-users" (email, firstName, lastName, password, roleId, status) VALUES 
        ('${user.email}', '${user.firstName}', '${user.lastName}', '${hashedPassword}', ${user.roleId}, 'ACTIVE')`
      );
    }

    // Insert Example Citizen
    await queryRunner.query(
      `INSERT INTO citizens (username, email, firstName, lastName, password, status) VALUES 
      ('yusaerguven', 'yusaerguven@gmail.com', 'Yusa', 'Erguven', '${hashedPassword}', 'ACTIVE')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete data in reverse order
    await queryRunner.query(`DELETE FROM category_roles`);
    await queryRunner.query(`DELETE FROM categories`);
    await queryRunner.query(`DELETE FROM citizens WHERE email = 'yusaerguven@gmail.com'`);
    await queryRunner.query(`DELETE FROM "internal-users" WHERE roleId IN (1, 10, 11, 12, 13, 14, 15, 16, 17)`);
    await queryRunner.query(`DELETE FROM roles WHERE id NOT IN (0, 1)`);
    await queryRunner.query(`DELETE FROM roles WHERE id IN (0, 1)`);
    await queryRunner.query(`DELETE FROM offices`);
  }
}

