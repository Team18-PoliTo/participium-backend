import {MigrationInterface, QueryRunner} from "typeorm";
import * as bcrypt from "bcrypt";

export class InitialSeed1000000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert Offices (Uffici)
        await queryRunner.query(
            `INSERT INTO offices (id, name, description)
             VALUES (1, 'Organization Office', 'Ufficio Organizzativo'),
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
            `INSERT INTO roles (id, role, officeId)
             VALUES (0, 'Unassigned', NULL),
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

        await queryRunner.query(
            `INSERT INTO categories (id, name, description)
     VALUES 
        (1, 'Water Supply - Drinking Water', 'Fornitura di Acqua - Acqua Potabile'),
        (2, 'Architectural Barriers', 'Barriere Architettoniche'),
        (3, 'Sewer System', 'Sistema Fognario'),
        (4, 'Public Lighting', 'Illuminazione Pubblica'),
        (5, 'Waste', 'Rifiuti'),
        (6, 'Road Signs and Traffic Lights', 'Segnaletica Stradale e Semafori'),
        (7, 'Roads and Urban Furnishings', 'Strade e Arredi Urbani'),
        (8, 'Public Green Areas and Playgrounds', 'Aree Verdi Pubbliche e Parchi Giochi'),
        (9, 'Other', 'Other type of category')`
        );


        // Insert Category-Role relationships (one-to-many)
       // Note: Public Relations Officer (roleId 10) does not handle specific categories
       // System roles 0 (Unassigned) and 1 (ADMIN) are not mapped to categories
        await queryRunner.query(
            `INSERT INTO category_roles (id, categoryId, roleId)
             VALUES
                 -- 1. Drinking Water Supply
                 (1, 1, 16),  -- Water Infrastructure Operator
                 (2, 1, 23),  -- Water Quality Inspector
                 (3, 1, 26),  -- Emergency Response Liaison

                 -- 2. Accessibility and Architectural Barriers
                 (4, 2, 17),  -- Accessibility Officer
                 (5, 2, 24),  -- Accessibility Inspector
                 (6, 2, 21),  -- Urban Mobility Planner

                 -- 3. Sewer System
                 (7, 3, 16),  -- Water Infrastructure Operator
                 (8, 3, 23),  -- Water Quality Inspector
                 (9, 3, 26),  -- Emergency Response Liaison

                 -- 4. Public Lighting
                 (10, 4, 12), -- Public Lighting Operator
                 (11, 4, 20), -- Public Lighting Technician
                 (12, 4, 26), -- Emergency Response Liaison

                 -- 5. Waste Management
                 (13, 5, 13), -- Waste Management Operator
                 (14, 5, 18), -- Environmental Surveillance Officer

                 -- 6. Traffic Signs and Traffic Lights
                 (15, 6, 14), -- Urban Mobility Operator
                 (16, 6, 21), -- Urban Mobility Planner
                 (17, 6, 19), -- Road Safety Inspector

                 -- 7. Roads and Urban Furnishings
                 (18, 7, 11), -- Street Maintenance Operator
                 (19, 7, 19), -- Road Safety Inspector

                 -- 8. Green Areas and Playgrounds
                 (20, 8, 15), -- Green Spaces Operator
                 (21, 8, 22), -- Green Maintenance Technician
                 (22, 8, 18) -- Environmental Surveillance Officer
            `
        );


        // Insert Initial Admin User and Internal Users for each technical role
        const hashedPassword = await bcrypt.hash("password123", 10);

        const internalUsers = [
            {email: "admin@participium.com", firstName: "Admin", lastName: "User", roleId: 1},
            {email: "marco.rossi@participium.com", firstName: "Marco", lastName: "Rossi", roleId: 10},
            {email: "giovanni.ferrari@participium.com", firstName: "Giovanni", lastName: "Ferrari", roleId: 11},
            {email: "luigi.bianchi@participium.com", firstName: "Luigi", lastName: "Bianchi", roleId: 12},
            {email: "francesco.rizzo@participium.com", firstName: "Francesco", lastName: "Rizzo", roleId: 13},
            {email: "antonio.russo@participium.com", firstName: "Antonio", lastName: "Russo", roleId: 14},
            {email: "paolo.moretti@participium.com", firstName: "Paolo", lastName: "Moretti", roleId: 15},
            {email: "andrea.romano@participium.com", firstName: "Andrea", lastName: "Romano", roleId: 16},
            {email: "matteo.colombo@participium.com", firstName: "Matteo", lastName: "Colombo", roleId: 17},
        ];

        for (const user of internalUsers) {
            await queryRunner.query(
                `INSERT INTO "internal-users" (email, firstName, lastName, password, roleId, status)
                 VALUES ('${user.email}', '${user.firstName}', '${user.lastName}', '${hashedPassword}', ${user.roleId},
                         'ACTIVE')`
            );
        }

        // Insert Example Citizen
        await queryRunner.query(
            `INSERT INTO citizens (username, email, firstName, lastName, password, status)
             VALUES ('yusaerguven', 'yusaerguven@gmail.com', 'Yusa', 'Erguven', '${hashedPassword}', 'ACTIVE')`
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