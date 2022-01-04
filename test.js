const optimize = require('.');
const check = (inp, expected) => {
	const output = optimize.optimize(inp).split('\n');
	if (
		output[0] !==
		'-- Optimized using a modified variant of https://gamesensical.github.io - See https://github.com/MokiyCodes/optimizelua.js for more information.'
	)
		throw new Error('No Watermark');
	if (output[1] !== expected)
		throw new Error('Recieved:\n  ' + output[1] + '\nExpected:\n  ' + expected);
};
const checks = [
	['print("Hello World!")', 'local print = print'],
	['Instance.new("Part")', 'local Instance_new = Instance.new'],
	[
		'require(game:GetService("ReplicatedStorage"):WaitForChild(string.char(77,111,100,117,108,101)))',
		'local string_char, require = string.char, require',
	],
	[
		'return string.sub(string.char(77,111,100,117,108,101),3,5)',
		'local string_char, string_sub = string.char, string.sub',
	],
	[
		`local exec = function()
  local Test = string.sub('gay shit yk',1,3);
  if game:GetService("Players").LocalPlayer.Character.Humanoid.Name ~= Test then
    print('Error yeah');
    while true do end;
  end;
  game:GetService('Players').LocalPlayer.Character:Destroy();
end`,
		'local string_sub, print = string.sub, print',
	],
];
let success = 0;
checks.forEach(element => {
	try {
		check(element[0], element[1]);
		success++;
	} catch (error) {
		console.error(error);
	}
});
if (success >= checks.length) console.log('All Tests Succeeded');
else throw new Error(`${success} of ${checks.length} tests succeeded`);
