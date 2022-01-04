# optimizelua.js

[![Test](https://github.com/MokiyCodes/optimizelua.js/actions/workflows/test.yml/badge.svg)](https://github.com/MokiyCodes/optimizelua.js/actions/workflows/test.yml)

gamesensical.github.io's optimizer, extracted into a node library

modified to be in ts and stuff like that

### usage

#### install

```bash
pnpm i optimizelua
```

#### import

```ts
const { optimize } = require('optimizelua');
// or
import optimize from 'optimizelua';
// or
import { optimize } from 'optimizelua';
```

#### use

```ts
console.log(optimize("print('Hello World!')"));
```

### credits

initial ts conversion: yieldingexploiter<br/>
ci: mokiy<br/>
move from ts for compiling to parcel: mokiy<br/>
original optimizer: [gamesensical.github.io](//gamesensical.github.io)
