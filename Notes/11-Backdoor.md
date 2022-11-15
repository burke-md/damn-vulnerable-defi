# Backdoor

## Hack:

### Step1:

Deploy a contract to act as a Gnosis Safe module (with malicious logic)

### Step2:

Generate the ABI to make call in module to malicious function

### Step3:

Call proxy factory w/ custom data 4 times.

## Notes:

### The chain of events (after calling the hack function):

`Hack()` will =>
- Iterate through list of users (4) and for each:
    - Build tx (`setup` signature & data)
    - Call `Safe` factory `createProxyWithCallback` and pass in previously built tx/other required args
    - On creation of new `Safe` the callback will be called (which is the malicious module) and a transfer of tokens will be approved
    - Within the same tx then previously approved transfer will be called
