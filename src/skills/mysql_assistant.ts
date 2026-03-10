
/**
 * Skill auto-generada por ChochiBot - REPARADA
 * Nombre: mysql_assistant
 * Descripción: Conexión y consultas a MySQL
 */

export const definition = {
    name: "mysql_assistant",
    description: "Ejecuta consultas en una base de datos MySQL (SELECT, UPDATE, etc.)",
    parameters: {
        type: "object",
        properties: {
            host: { type: "string", description: "Host de la DB" },
            port: { type: "number", description: "Puerto (defecto 3306)", default: 3306 },
            user: { type: "string", description: "Usuario" },
            password: { type: "string", description: "Password" },
            database: { type: "string", description: "Nombre de la base de datos" },
            query: { type: "string", description: "Consulta SQL a ejecutar" },
            connection: { type: "string", description: "Opcional: Nombre de la conexión configurada" }
        },
        required: ["query"]
    }
};

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const handler = async (args: any) => {
    try {
        const host = args.host || process.env.MYSQL_HOST;
        const user = args.user || process.env.MYSQL_USER;
        const password = args.password || process.env.MYSQL_PASSWORD;
        const database = args.database || process.env.MYSQL_DATABASE;
        const port = args.port || Number(process.env.MYSQL_PORT) || 3306;

        if (!host || !user || !password || !database) {
            throw new Error("Faltan parámetros de conexión (host, user, password o database). Configúralos en el .env o pásalos como argumentos.");
        }

        const connection = await mysql.createConnection({
            host,
            user,
            password,
            database,
            port
        });

        const [rows] = await connection.execute(args.query);
        await connection.end();

        // Intelligently format the output for the LLM and User
        let formattedData = "";
        if (Array.isArray(rows)) {
            if (rows.length === 0) {
                formattedData = "No se encontraron registros.";
            } else {
                // If it's a simple list (like SHOW TABLES)
                const firstRowKeys = Object.keys(rows[0]);
                if (firstRowKeys.length === 1) {
                    const list = rows.map((r: any) => `• ${r[firstRowKeys[0]]}`).join('\n');
                    formattedData = `Registros encontrados (${rows.length}):\n${list}`;
                } else {
                    // It's a table-like result
                    const preview = rows.slice(0, 5).map((r: any) => JSON.stringify(r)).join('\n');
                    formattedData = `Encontrados ${rows.length} registros. Aquí tienes los primeros 5:\n${preview}${rows.length > 5 ? '\n...' : ''}`;
                }
            }
        } else {
            formattedData = "La consulta se ejecutó correctamente.";
        }

        return {
            status: "success",
            results: rows,
            count: Array.isArray(rows) ? rows.length : 1,
            formatted_output: `✅ **MySQL [${database}]**: ${formattedData}`
        };
    } catch (e: any) {

        return { status: "error", message: `Error en MySQL: ${e.message}` };
    }
};
