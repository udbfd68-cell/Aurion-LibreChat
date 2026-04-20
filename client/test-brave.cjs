var https = require('https');
https.get('https://search.brave.com/search?q=test', { headers: { 'User-Agent': 'Mozilla/5.0' } }, function (r) {
  var d = '';
  r.on('data', function (c) { d += c; });
  r.on('end', function () {
    console.log('Total length:', d.length);
    // Check if results are in a <script> JSON block
    var scriptMatches = d.match(/<script[^>]*id="[^"]*"[^>]*>[\s\S]*?<\/script>/g);
    console.log('Script blocks with id:', scriptMatches ? scriptMatches.length : 0);
    
    // Look for JSON data in the page
    var jsonMatch = d.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
    console.log('Has __DATA__:', !!jsonMatch);
    
    var jsonMatch2 = d.match(/application\/json[^>]*>([\s\S]*?)<\/script>/);
    console.log('Has application/json script:', !!jsonMatch2);
    if (jsonMatch2) console.log('JSON sample:', jsonMatch2[1].substring(0, 300));
    
    // Check for noscript content
    var noscript = d.match(/<noscript[\s\S]*?<\/noscript>/g);
    console.log('Noscript blocks:', noscript ? noscript.length : 0);
    
    // Look for actual result URLs in the page
    var urls = d.match(/https?:\/\/[^"'\s<>]+/g);
    var uniqueUrls = [...new Set(urls || [])].filter(function(u) { 
      return !u.includes('brave.com') && !u.includes('cdn.') && !u.includes('.css') && !u.includes('.js') && u.length < 200;
    });
    console.log('External URLs found:', uniqueUrls.length);
    uniqueUrls.slice(0, 5).forEach(function(u) { console.log('  ', u); });
  });
});
