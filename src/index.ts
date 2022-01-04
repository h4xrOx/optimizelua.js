const luaparse = require('./luaparse');
// optimizer
const traverseAST = (
	object: any,
	callsToNonLocals: any,
	assignments: any,
	i: any
) => {
	if (!object) {
		return;
	}

	// check if object can be traversed and do that
	if (object.forEach) {
		// object is an array / has forEach
		object.forEach(function (el) {
			if (el) {
				traverseAST(el, callsToNonLocals, assignments, i + 1);
			}
		});
	} else if (typeof object == 'object') {
		// object is just a simple object, try to traverse all keys
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				traverseAST(object[key], callsToNonLocals, assignments, i + 1);
			}
		}
	}

	// check if object is a function call
	if (object.type == 'CallStatement' || object.type == 'CallExpression') {
		// get expression
		let callExpression =
			object.type == 'CallStatement' ? object.expression : object;

		if (
			callExpression.base.type == 'MemberExpression' &&
			callExpression.base.indexer == '.' &&
			callExpression.base.base != null &&
			callExpression.base.base.name != null
		) {
			// call to a function in a table (client.log)
			callsToNonLocals.push([
				callExpression.base.base.name,
				callExpression.base.identifier.name,
				i,
			]);
		} else if (
			callExpression.base.type == 'Identifier' &&
			callExpression.base.name.match(/_/g) &&
			callExpression.base.name.match(/_/g).length >= 1
		) {
			// most likely call to a already localized function in a table (client_log)
			let parts = callExpression.base.name.split('_');
			callsToNonLocals.push([
				parts[0],
				callExpression.base.name.replace(`${parts[0]}_`, ''),
				i,
			]);
		} else if (callExpression.base.type == 'Identifier') {
			// call to a local / global without _ in the name (pcall)
			callsToNonLocals.push([callExpression.base.name, '', i]);
		}
	}

	// check if object is a local variable assignment or function declaration
	if (object.type == 'LocalStatement') {
		object.variables.forEach(function (variable) {
			assignments.push([variable.name, i + 1]);
		});
	} else if (object.type == 'FunctionDeclaration' && object.identifier) {
		assignments.push([object.identifier.name, i + 1]);
	}
};

export const optimize: (code: string, localsOnly?: boolean) => string = (
	code: any,
	localsOnly?: boolean
) => {
	let header =
		'-- Optimized using a modified variant of https://gamesensical.github.io - See https://github.com/MokiyCodes/optimizelua.js for more information.';
	let codeIndex = null;
	let localsLine: string | string[];

	// if code contains our header treat the next line after it as previous localization (ignored on generation, replaced with new version)
	if (code.indexOf(header) != -1) {
		// find index of comment
		codeIndex = code.indexOf(header) + header.length;

		// get code starting from end of comment
		localsLine = code.slice(codeIndex);

		// get to next line
		codeIndex += localsLine.indexOf('\n') + 1;
		localsLine = localsLine.slice(localsLine.indexOf('\n') + 1);

		// remove line
		code =
			code.slice(0, codeIndex) +
			code.slice(codeIndex + localsLine.indexOf('\n'));
	}

	// parse code into abstract syntax tree (if required)
	let ast = code;
	if (!ast || ast.type != 'Chunk') {
		try {
			ast = luaparse.parse(ast);
		} catch (e) {
			console.error(`Failed to parse lua code: ${e.toString()}`);
			return;
		}
	}

	// traverse AST to find local variable assignments and calls to non-locals
	let callsToNonLocals = [],
		assignments = [];
	traverseAST(ast.body, callsToNonLocals, assignments, 0);

	// ignore all local variable assignments in localization generation (for now, might not work if locals are assigned in blocks)
	let ignored = [];
	assignments.forEach(function (assignment) {
		ignored.push(assignment[0]);
	});

	// generate array of all functions we need to localize
	let localization = [];
	callsToNonLocals.forEach(function (call) {
		if (
			call[2] > 0 &&
			!ignored.includes(`${call[0]}_${call[1]}`) &&
			!ignored.includes(call[0])
		) {
			localization.push([call[0], call[1]]);
			ignored.push(`${call[0]}_${call[1]}`);
		}
	});

	// sort by alphabet with non-indexed globals (tostring, pcall, type, etc) last
	localization = localization.sort(function (a, b) {
		return a[1] == '' ? 1 : a.toString().localeCompare(b.toString());
	});

	// generate left and right side of assignment
	let left = [],
		right = [];

	localization.forEach(function (local) {
		if (local[1] == '') {
			left.push(local[0]);
			right.push(local[0]);
		} else {
			left.push(`${local[0]}_${local[1]}`);
			right.push(`${local[0]}.${local[1]}`);
		}
	});

	// generate final assignment string
	let locals =
		left.length > 0 ? `local ${left.join(', ')} = ${right.join(', ')}` : '';
	if (localsOnly) {
		return locals != '' ? header + locals : '';
	}

	// optimize actual calls by replacing all dot-syntax (client.log) with underscore syntax (client_log)
	localization.forEach(function (local) {
		code = code
			.split(`${local[0]}.${local[1]}`)
			.join(`${local[0]}_${local[1]}`);
	});

	if (codeIndex != null) {
		return code.slice(0, codeIndex) + locals + code.slice(codeIndex);
	}

	return `${header}\n${locals}\n\n${code}`;
};
export default optimize;
