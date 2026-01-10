// Test PrePostSEO API with 'data' parameter
const apiKey = 'ac4e107efda45203d98b01e991d30dd108b1f411';
const testText = 'Inside that cage there was a green teddy bear';

async function testWithDataParam() {
    console.log('=== Testing with "data" parameter ===');
    console.log('API Key:', apiKey.substring(0, 8) + '...');
    console.log('Text:', testText);
    console.log('---');

    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('data', testText); // Using 'data' instead of 'query'

    try {
        const response = await fetch('https://www.prepostseo.com/apis/checkPlag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        console.log('Status:', response.status, response.statusText);
        const text = await response.text();

        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
            console.log('\n❌ Returned HTML instead of JSON');
            console.log('Preview:', text.substring(0, 200));
        } else {
            console.log('\nResponse:');
            console.log(text);

            try {
                const data = JSON.parse(text);
                console.log('\n✅ Successfully parsed JSON!');
                console.log('Keys in response:', Object.keys(data));
            } catch (e) {
                console.log('\n❌ Could not parse as JSON');
            }
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testWithDataParam();
