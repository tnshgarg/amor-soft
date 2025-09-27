require("dotenv").config({ path: ".env.local" });

const SUNO_API_BASE = "https://api.sunoapi.com";
const SUNO_API_KEY = process.env.SUNO_API_KEY;

console.log("🔄 Testing Improved Polling Implementation...\n");

// Simulate the improved getTaskStatus function
async function getTaskStatus(taskId) {
  const url = `/api/v1/suno/task/${taskId}`;
  const response = await fetch(`${SUNO_API_BASE}${url}`, {
    headers: {
      Authorization: `Bearer ${SUNO_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  // Handle 202 "not ready" response
  if (response.status === 202) {
    const notReadyResponse = await response.json();
    console.log(`Task ${taskId} not ready:`, notReadyResponse);
    // Return a pending response in the expected format
    return {
      code: 202,
      data: [],
      message: notReadyResponse.error || "Task not ready, please wait",
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Suno API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Simulate improved polling with shorter test intervals
async function testPolling(taskId, maxAttempts = 5, intervalMs = 10000) {
  let lastError = null;

  console.log(`Starting polling for task ${taskId}...`);
  console.log(
    `Max attempts: ${maxAttempts}, Interval: ${intervalMs / 1000}s\n`
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxAttempts}:`);
      const result = await getTaskStatus(taskId);

      // Handle 202 "not ready" response
      if (result.code === 202) {
        console.log(`  ⏳ Task not ready, continuing to poll...`);
        console.log(`  Message: ${result.message}`);

        // Wait before next poll
        if (attempt < maxAttempts - 1) {
          console.log(
            `  Waiting ${intervalMs / 1000}s before next attempt...\n`
          );
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
        continue;
      }

      // Check if result.data exists and is an array
      if (!result.data || !Array.isArray(result.data)) {
        console.log(`  ⚠️  Invalid data returned:`, result);

        // Wait before next poll
        if (attempt < maxAttempts - 1) {
          console.log(
            `  Waiting ${intervalMs / 1000}s before next attempt...\n`
          );
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
        continue;
      }

      // Check if any clips are completed
      const hasCompleted = result.data.some(
        (clip) => clip.state === "succeeded"
      );
      const hasFailed = result.data.some((clip) => clip.state === "failed");
      const allPending = result.data.every(
        (clip) => clip.state === "pending" || clip.state === "running"
      );

      console.log(`  📊 Result analysis:`);
      console.log(`    Code: ${result.code}`);
      console.log(`    Clips: ${result.data.length}`);
      console.log(`    Completed: ${hasCompleted}`);
      console.log(`    Failed: ${hasFailed}`);
      console.log(`    All pending: ${allPending}`);

      if (hasCompleted || hasFailed) {
        console.log(`  🎉 Polling complete!`);
        return result;
      }

      if (!allPending) {
        console.log(`  ❓ Some clips in unknown state`);
        return result;
      }

      // Wait before next poll
      if (attempt < maxAttempts - 1) {
        console.log(`  Waiting ${intervalMs / 1000}s before next attempt...\n`);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      lastError = error;
      console.log(`  ❌ Attempt ${attempt + 1} failed:`, error.message);

      // Exponential backoff for failed requests
      if (attempt < maxAttempts - 1) {
        const backoffDelay = Math.min(
          intervalMs * Math.pow(1.5, attempt),
          60000
        ); // Max 1 minute for test
        console.log(
          `  Waiting ${
            backoffDelay / 1000
          }s before retry (exponential backoff)...\n`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  // If all attempts failed
  if (lastError) {
    console.log(`\n❌ Polling failed after ${maxAttempts} attempts`);
    console.log(`Last error: ${lastError.message}`);

    // Return a failed result instead of throwing
    return {
      code: 500,
      data: [],
      message: `Polling failed: ${lastError.message}`,
    };
  }

  console.log(`\n⏰ Polling timed out after ${maxAttempts} attempts`);
  return {
    code: 408,
    data: [],
    message: "Polling timed out",
  };
}

async function testImprovedPolling() {
  try {
    // 1. Create a task first
    console.log("1. Creating a test task...");
    const createData = {
      task_type: "persona_music",
      custom_mode: true,
      prompt:
        "[Verse]\nTest improved polling\nWith better error handling\n\n[Chorus]\nThis should work better\nWith the new implementation",
      title: "Improved Polling Test",
      tags: "test, improved",
      persona_id: "c08806c1-34fa-4290-a78d-0c623eb1dd1c",
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

    if (!createResponse.ok) {
      console.log(`❌ Task creation failed: ${createResponse.status}`);
      return;
    }

    const createResult = await createResponse.json();
    console.log("✅ Task created successfully");
    console.log(`   Task ID: ${createResult.task_id}\n`);

    // 2. Test improved polling
    console.log("2. Testing improved polling implementation...");
    const result = await testPolling(createResult.task_id, 5, 10000); // 5 attempts, 10s intervals for testing

    console.log("\n🎉 IMPROVED POLLING TEST COMPLETE!");
    console.log("\n📊 Final Result:");
    console.log(`   Code: ${result.code}`);
    console.log(`   Message: ${result.message}`);
    console.log(
      `   Data length: ${result.data ? result.data.length : "undefined"}`
    );

    console.log("\n✅ Improvements Made:");
    console.log('   • Handle 202 "not ready" responses properly');
    console.log("   • Increased polling intervals to 30 seconds");
    console.log("   • Added exponential backoff for failed requests");
    console.log("   • Better error handling and logging");
    console.log("   • Graceful degradation instead of throwing errors");

    console.log("\n🎯 Expected Behavior:");
    console.log('   • Songs will be marked as "pending" during API issues');
    console.log('   • Users will see "generation in progress" messages');
    console.log("   • System will continue working despite API instability");
    console.log("   • Better user experience with proper status updates");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testImprovedPolling();
