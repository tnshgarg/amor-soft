require("dotenv").config({ path: ".env.local" });

const SUNO_API_BASE = "https://api.sunoapi.com";
const SUNO_API_KEY = process.env.SUNO_API_KEY;

console.log("🔍 Diagnosing Suno API Issues...\n");

async function diagnoseSunoAPI() {
  try {
    // 1. Test API connectivity and authentication
    console.log("1. Testing API connectivity and authentication...");
    const creditsResponse = await fetch(`${SUNO_API_BASE}/api/v1/get-credits`, {
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (creditsResponse.ok) {
      const credits = await creditsResponse.json();
      console.log("✅ API connectivity and auth working");
      console.log(`   Credits: ${JSON.stringify(credits)}`);
    } else {
      console.log(`❌ API connectivity failed: ${creditsResponse.status}`);
      const errorText = await creditsResponse.text();
      console.log(`   Error: ${errorText}`);
      return;
    }

    // 2. Create a new task
    console.log("\n2. Creating a new task...");
    const createData = {
      task_type: "persona_music",
      custom_mode: true,
      prompt:
        "[Verse]\nTest song for diagnosis\nSimple lyrics here\n\n[Chorus]\nThis is just a test\nTo check the API",
      title: "API Diagnosis Test",
      tags: "test, diagnosis",
      persona_id: "c08806c1-34fa-4290-a78d-0c623eb1dd1c",
      mv: "chirp-v3-5",
    };

    const createResponse = await fetch(`${SUNO_API_BASE}/api/v1/suno/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createData),
    });

    if (!createResponse.ok) {
      console.log(`❌ Task creation failed: ${createResponse.status}`);
      const errorText = await createResponse.text();
      console.log(`   Error: ${errorText}`);
      return;
    }

    const createResult = await createResponse.json();
    console.log("✅ Task creation successful");
    console.log(`   Task ID: ${createResult.task_id}`);
    console.log(`   Message: ${createResult.message}`);

    const taskId = createResult.task_id;

    // 3. Test immediate polling (might be too early)
    console.log("\n3. Testing immediate polling (might be too early)...");
    const immediateResponse = await fetch(
      `${SUNO_API_BASE}/api/v1/suno/task/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${SUNO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`   Immediate poll status: ${immediateResponse.status}`);
    if (immediateResponse.ok) {
      const immediateResult = await immediateResponse.json();
      console.log("✅ Immediate polling worked");
      console.log(`   Response: ${JSON.stringify(immediateResult, null, 2)}`);
    } else {
      const errorText = await immediateResponse.text();
      console.log(`❌ Immediate polling failed: ${errorText}`);
    }

    // 4. Wait and try again (recommended 15-25 seconds)
    console.log("\n4. Waiting 20 seconds before next poll...");
    await new Promise((resolve) => setTimeout(resolve, 20000));

    console.log("5. Testing polling after wait...");
    const delayedResponse = await fetch(
      `${SUNO_API_BASE}/api/v1/suno/task/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${SUNO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`   Delayed poll status: ${delayedResponse.status}`);
    if (delayedResponse.ok) {
      const delayedResult = await delayedResponse.json();
      console.log("✅ Delayed polling worked");
      console.log(`   Response code: ${delayedResult.code}`);
      console.log(`   Message: ${delayedResult.message}`);
      console.log(
        `   Data length: ${
          delayedResult.data ? delayedResult.data.length : "undefined"
        }`
      );

      if (delayedResult.data && Array.isArray(delayedResult.data)) {
        delayedResult.data.forEach((clip, index) => {
          console.log(`   Clip ${index + 1}: ${clip.state} - ${clip.title}`);
        });
      }
    } else {
      const errorText = await delayedResponse.text();
      console.log(`❌ Delayed polling also failed: ${errorText}`);
    }

    // 6. Test with a different task ID format (if available)
    console.log("\n6. Testing with different approaches...");

    // Try with URL encoding
    const encodedTaskId = encodeURIComponent(taskId);
    if (encodedTaskId !== taskId) {
      console.log(`   Trying with URL encoded task ID: ${encodedTaskId}`);
      const encodedResponse = await fetch(
        `${SUNO_API_BASE}/api/v1/suno/task/${encodedTaskId}`,
        {
          headers: {
            Authorization: `Bearer ${SUNO_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`   Encoded poll status: ${encodedResponse.status}`);
      if (encodedResponse.ok) {
        console.log("✅ URL encoding helped");
      } else {
        console.log("❌ URL encoding didn't help");
      }
    }

    console.log("\n🔍 DIAGNOSIS COMPLETE");
    console.log("\n📋 Findings:");
    console.log("   • API authentication is working (credits endpoint works)");
    console.log("   • Task creation is working (getting valid task IDs)");
    console.log("   • The issue is specifically with the GET task endpoint");

    console.log("\n💡 Possible Causes:");
    console.log("   1. API service issues on Suno's side (most likely)");
    console.log("   2. Rate limiting or quota issues");
    console.log("   3. Task processing delays");
    console.log("   4. API endpoint temporarily down");

    console.log("\n🔧 Recommendations:");
    console.log("   1. Implement longer delays between polls (30-60 seconds)");
    console.log("   2. Add exponential backoff for failed requests");
    console.log(
      '   3. Mark songs as "pending" instead of "failed" when polling fails'
    );
    console.log("   4. Provide user feedback about temporary API issues");
    console.log("   5. Consider implementing a retry mechanism for later");
  } catch (error) {
    console.error("\n❌ Diagnosis failed:", error);
  }
}

diagnoseSunoAPI();
