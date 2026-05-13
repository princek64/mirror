import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

export const getSession = () => driver.session();

export const closeDriver = () => driver.close();

export const initSchema = async () => {
  const session = getSession();
  try {
    console.log('Initializing Neo4j Schema...');
    // Create constraints
    await session.executeWrite(tx => 
      tx.run('CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE')
    );
    await session.executeWrite(tx => 
      tx.run('CREATE CONSTRAINT pattern_label IF NOT EXISTS FOR (p:BehaviorPattern) REQUIRE p.label IS UNIQUE')
    );
    console.log('Schema initialized successfully.');
  } catch (error) {
    console.error('Error initializing schema:', error);
  } finally {
    await session.close();
  }
};
