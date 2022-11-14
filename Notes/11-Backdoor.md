# Backdoor

## Hack:

### Step1:

Deploy a contract to act as a Gnosis Safe module (with malicious logic)

### Step2:

Generate the ABI to make call in module to malicious function

### Step3:

Call proxy factory w/ custom data 4 times.
