require("dotenv").config({ path: ".env.local" });

const SUNO_API_BASE = "https://api.sunoapi.com";
const SUNO_API_KEY = process.env.SUNO_API_KEY;

console.log("🎵 Testing Normal Mode (without persona_id)...\n");

async function testNormalMode() {
  try {
    // 1. Test API connectivity first
    console.log("1. Testing API connectivity...");
    const creditsResponse = await fetch(`${SUNO_API_BASE}/api/v1/get-credits`, {
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (creditsResponse.ok) {
      const credits = await creditsResponse.json();
      console.log("✅ API connectivity working");
      console.log(`   Credits: ${JSON.stringify(credits)}`);
    } else {
      console.log(`❌ API connectivity failed: ${creditsResponse.status}`);
      return;
    }

    // 2. Test normal mode (create_music without persona_id)
    console.log(
      "\n2. Testing normal mode (create_music without persona_id)..."
    );
    const normalModeData = {
      task_type: "create_music",
      custom_mode: true,
      prompt:
        "[Verse]\nTest song in normal mode\nNo persona required here\n\n[Chorus]\nThis should work better\nWithout persona issues",
      title: "Normal Mode Test",
      tags: "test, normal, hindi",
      mv: "chirp-v5",
      // No persona_id included
    };

    console.log("   Request data:", JSON.stringify(normalModeData, null, 2));

    const normalResponse = await fetch(`${SUNO_API_BASE}/api/v1/suno/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalModeData),
    });

    console.log(`   Normal mode response status: ${normalResponse.status}`);

    if (normalResponse.ok) {
      const normalResult = await normalResponse.json();
      console.log("✅ Normal mode creation successful!");
      console.log(`   Task ID: ${normalResult.task_id}`);
      console.log(`   Message: ${normalResult.message}`);

      // 3. Test polling with normal mode task
      console.log("\n3. Testing polling with normal mode task...");
      const taskId = normalResult.task_id;

      // Wait a bit before first poll
      console.log("   Waiting 10 seconds before first poll...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Try polling
      const pollResponse = await fetch(
        `${SUNO_API_BASE}/api/v1/suno/task/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${SUNO_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`   Poll response status: ${pollResponse.status}`);

      if (pollResponse.status === 202) {
        const notReadyResponse = await pollResponse.json();
        console.log('✅ Got expected "not ready" response');
        console.log(`   Response: ${JSON.stringify(notReadyResponse)}`);

        // Wait longer and try again
        console.log("\n   Waiting 30 seconds before second poll...");
        await new Promise((resolve) => setTimeout(resolve, 30000));

        const secondPollResponse = await fetch(
          `${SUNO_API_BASE}/api/v1/suno/task/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${SUNO_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(
          `   Second poll response status: ${secondPollResponse.status}`
        );

        if (secondPollResponse.ok) {
          const secondPollResult = await secondPollResponse.json();
          console.log("✅ Second poll successful!");
          console.log(`   Response code: ${secondPollResult.code}`);
          console.log(`   Message: ${secondPollResult.message}`);
          console.log(
            `   Data length: ${
              secondPollResult.data ? secondPollResult.data.length : "undefined"
            }`
          );
        } else {
          const errorText = await secondPollResponse.text();
          console.log(`❌ Second poll failed: ${errorText}`);
        }
      } else if (pollResponse.ok) {
        const pollResult = await pollResponse.json();
        console.log("✅ First poll successful!");
        console.log(`   Response: ${JSON.stringify(pollResult, null, 2)}`);
      } else {
        const errorText = await pollResponse.text();
        console.log(`❌ First poll failed: ${errorText}`);
      }
    } else {
      const errorText = await normalResponse.text();
      console.log(`❌ Normal mode creation failed: ${errorText}`);

      // 4. Compare with persona mode for debugging
      console.log("\n4. Comparing with persona mode...");
      const personaModeData = {
        task_type: "persona_music",
        custom_mode: true,
        prompt:
          "[Verse]\nTest song in persona mode\nWith persona_id included\n\n[Chorus]\nThis might have issues\nDue to persona requirements",
        title: "Persona Mode Test",
        tags: "test, persona, hindi",
        persona_id: "c08806c1-34fa-4290-a78d-0c623eb1dd1c",
        mv: "chirp-v5",
      };

      const personaResponse = await fetch(
        `${SUNO_API_BASE}/api/v1/suno/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUNO_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(personaModeData),
        }
      );

      console.log(`   Persona mode response status: ${personaResponse.status}`);

      if (personaResponse.ok) {
        const personaResult = await personaResponse.json();
        console.log("✅ Persona mode also works");
        console.log(`   Task ID: ${personaResult.task_id}`);
      } else {
        const personaErrorText = await personaResponse.text();
        console.log(`❌ Persona mode also failed: ${personaErrorText}`);
      }
    }

    console.log("\n🎯 NORMAL MODE TEST COMPLETE!");

    console.log("\n📊 Results Summary:");
    console.log("   • API connectivity: Working");
    console.log(
      "   • Normal mode (create_music): " +
        (normalResponse.ok ? "Working ✅" : "Failed ❌")
    );
    console.log(
      "   • Polling behavior: " + (normalResponse.ok ? "Tested" : "Not tested")
    );

    console.log("\n💡 Key Insights:");
    console.log("   1. Normal mode removes persona_id dependency");
    console.log("   2. Should reduce API complexity and potential issues");
    console.log(
      "   3. Polling behavior should be the same regardless of creation mode"
    );
    console.log(
      "   4. If normal mode works, it's a simpler and more reliable approach"
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testNormalMode();
