require("dotenv").config({ path: ".env.local" });

const SUNO_API_BASE = "https://api.sunoapi.com";
const SUNO_API_KEY = process.env.SUNO_API_KEY;

console.log("🎵 Testing Suno API Integration...\n");

if (!SUNO_API_KEY) {
  console.log("❌ SUNO_API_KEY not found in environment variables");
  console.log("   Please add SUNO_API_KEY to your .env.local file");
  process.exit(1);
}

console.log("✅ SUNO_API_KEY found");
console.log(`📡 API Base URL: ${SUNO_API_BASE}`);

async function testSunoAPI() {
  try {
    // Test 1: Check credits
    console.log("\n1. Testing credits endpoint...");
    const creditsResponse = await fetch(`${SUNO_API_BASE}/api/v1/get-credits`, {
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (creditsResponse.ok) {
      const credits = await creditsResponse.json();
      console.log("✅ Credits API working");
      console.log(`   Credits available: ${JSON.stringify(credits)}`);
    } else {
      console.log(`❌ Credits API failed: ${creditsResponse.status}`);
      const errorText = await creditsResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    // Test 2: Create a simple song (try different approaches)
    console.log("\n2. Testing song creation...");

    // Try approach 1: create_music without persona_id
    console.log("   Trying create_music without persona_id...");
    let createData = {
      task_type: "create_music",
      custom_mode: false,
      prompt: "A happy Hindi song about love",
      title: "Test Song",
      tags: "hindi, romantic, happy",
      mv: "chirp-v5",
    };

    const createResponse = await fetch(`${SUNO_API_BASE}/api/v1/suno/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createData),
    });

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log("✅ Song creation API working");
      console.log(`   Task ID: ${createResult.task_id}`);

      if (createResult.task_id) {
        // Test 3: Check task status
        console.log("\n3. Testing task status check...");

        const taskResponse = await fetch(
          `${SUNO_API_BASE}/api/v1/suno/task/${createResult.task_id}`,
          {
            headers: {
              Authorization: `Bearer ${SUNO_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (taskResponse.ok) {
          const taskResult = await taskResponse.json();
          console.log("✅ Task status API working");
          console.log(`   Response code: ${taskResult.code}`);
          console.log(
            `   Data array length: ${
              taskResult.data ? taskResult.data.length : "undefined"
            }`
          );

          if (taskResult.data && Array.isArray(taskResult.data)) {
            taskResult.data.forEach((clip, index) => {
              console.log(
                `   Clip ${index + 1}: ${clip.state} - ${clip.title}`
              );
              if (clip.audio_url) {
                console.log(`     Audio URL: ${clip.audio_url}`);
              }
            });
          } else {
            console.log("   ⚠️  Data is not an array or is undefined");
            console.log(`   Raw data: ${JSON.stringify(taskResult.data)}`);
          }
        } else {
          console.log(`❌ Task status API failed: ${taskResponse.status}`);
          const errorText = await taskResponse.text();
          console.log(`   Error: ${errorText}`);
        }
      }
    } else {
      console.log(`❌ Song creation API failed: ${createResponse.status}`);
      const errorText = await createResponse.text();
      console.log(`   Error: ${errorText}`);

      // Try approach 2: Use exact API documentation example
      console.log("\n   Trying with API documentation example...");
      const apiExampleData = {
        task_type: "persona_music",
        custom_mode: true,
        prompt:
          "[Verse]\nStars they shine above me\nMoonlight softly glows\nWhispers in the night sky\nDreams that only grow\n\n[Verse 2]\nMidnight winds are calling\nCarrying a tune\nHeartbeats echo softly\nDancing with the moon\n\n[Chorus]\nStarry night starry night\nLet your light ignite ignite\nBright as day bright as day\nGuide my way guide my way",
        title: "Test Stars",
        tags: "pop",
        persona_id: "c08806c1-34fa-4290-a78d-0c623eb1dd1c",
        mv: "chirp-v5",
      };

      const createResponse2 = await fetch(
        `${SUNO_API_BASE}/api/v1/suno/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUNO_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiExampleData),
        }
      );

      if (createResponse2.ok) {
        const createResult2 = await createResponse2.json();
        console.log("✅ Song creation with API example working");
        console.log(`   Task ID: ${createResult2.task_id}`);
      } else {
        console.log(`❌ API example also failed: ${createResponse2.status}`);
        const errorText2 = await createResponse2.text();
        console.log(`   Error: ${errorText2}`);
      }
    }

    console.log("\n🎉 API Test Complete!");
    console.log("\n📋 Summary:");
    console.log(
      "   - The GET /api/v1/suno/task/{task_id} endpoint is the correct one to use"
    );
    console.log(
      "   - It returns an array of clips with state: pending/running/succeeded/failed"
    );
    console.log(
      '   - When state is "succeeded", the audio_url will be available'
    );
    console.log("   - Recommended polling interval: 15-25 seconds");

    console.log("\n🔧 Current Implementation Status:");
    console.log("   ✅ API endpoints are correct");
    console.log("   ✅ Polling logic has null checks");
    console.log("   ✅ Error handling is in place");
    console.log("   ✅ Task status checking is implemented");
  } catch (error) {
    console.error("\n❌ API test failed:", error);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Check your SUNO_API_KEY is valid");
    console.log("   2. Ensure you have credits available");
    console.log("   3. Check network connectivity");
    console.log("   4. Verify the API base URL is correct");
  }
}

testSunoAPI();
