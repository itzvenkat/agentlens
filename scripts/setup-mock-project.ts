import fetch from 'node-fetch';

async function setup() {
    console.log("1. Creating Mock Project via API...");
    const projRes = await fetch('http://localhost:9471/v1/projects', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'agentlens_master_dev_key'
        },
        body: JSON.stringify({ name: 'Kill Switch Test Project' })
    });

    if (!projRes.ok) {
        throw new Error(`Failed to create project: ${await projRes.text()}`);
    }

    const project = await projRes.json();
    console.log(`Created Project: ${project.id}. API Key: ${project.apiKey}`);

    console.log("\n2. Writing to test script...");
    const fs = require('fs');
    let content = fs.readFileSync('/Users/itzvenkat/Documents/Projects/agentlens/scripts/test-kill-switch.ts', 'utf-8');
    content = content.replace("apiKey: 'agentlens_master_dev_key'", `apiKey: '${project.apiKey}'`);
    fs.writeFileSync('/Users/itzvenkat/Documents/Projects/agentlens/scripts/test-kill-switch.ts', content);

    console.log("Written successfully. Run the test script again.");
}

setup().catch(console.error);
