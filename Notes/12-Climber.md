# 12 Climber

## Hack:

### Step1:

Ensure we have control of the `PROPOSER_ROLE`
- We will need this to be another contract(prevent the recurssive issue with scheduling and schedule)

### Step2:

Upgrade proxy implementation contract(manipulate function logic)

### Step3:

Update delay to be 0
- This will enable us to use one tx for the hack

### Step4:

Schedule the action by calling other contract. Note above, the mention of preventing the recursive issue.

### Step5:

Set the `sweeper` as the attack contract and remove funds. 

## Contracts require for hack:
