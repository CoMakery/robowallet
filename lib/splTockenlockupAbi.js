const TOKEN_LOCKUP_ABI = {
  'version': '0.1.0',
  'name': 'tokenlock',
  'instructions': [
    {
      'name': 'initialWizeTokenlock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': true,
          'isSigner': true
        },
        {
          'name': 'escrowAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'mintAddress',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'tokenProgram',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'maxReleaseDelay',
          'type': 'u64'
        },
        {
          'name': 'minTimelockAmount',
          'type': 'u64'
        }
      ]
    },
    {
      'name': 'createReleaseSchedule',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': false,
          'isSigner': true
        }
      ],
      'args': [
        {
          'name': 'uuid',
          'type': {
            'array': [
              'u8',
              16
            ]
          }
        },
        {
          'name': 'releaseCount',
          'type': 'u32'
        },
        {
          'name': 'delayUntilFirstReleaseInSeconds',
          'type': 'u64'
        },
        {
          'name': 'initialReleasePortionInBips',
          'type': 'u32'
        },
        {
          'name': 'periodBetweenReleasesInSeconds',
          'type': 'u64'
        }
      ]
    },
    {
      'name': 'fundReleaseSchedule',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'escrowAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': false,
          'isSigner': true
        },
        {
          'name': 'from',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'to',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'tokenProgram',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'uuid',
          'type': {
            'array': [
              'u8',
              16
            ]
          }
        },
        {
          'name': 'amount',
          'type': 'u64'
        },
        {
          'name': 'commencementTimestamp',
          'type': 'u64'
        },
        {
          'name': 'scheduleId',
          'type': 'u32'
        },
        {
          'name': 'cancelableBy',
          'type': {
            'vec': 'publicKey'
          }
        }
      ]
    },
    {
      'name': 'transfer',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'escrowAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'pdaAccount',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': false,
          'isSigner': true
        },
        {
          'name': 'from',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'to',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'tokenProgram',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'value',
          'type': 'u64'
        }
      ]
    },
    {
      'name': 'transferTimelock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'escrowAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'pdaAccount',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': true,
          'isSigner': true
        },
        {
          'name': 'from',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'to',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'tokenProgram',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'value',
          'type': 'u64'
        },
        {
          'name': 'timelockId',
          'type': 'u32'
        }
      ]
    },
    {
      'name': 'cancelTimelock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'escrowAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'pdaAccount',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': false,
          'isSigner': true
        },
        {
          'name': 'target',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'reclaimer',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'tokenProgram',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'timelockId',
          'type': 'u32'
        }
      ]
    },
    {
      'name': 'scheduleCount',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': []
    },
    {
      'name': 'timelockOf',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        },
        {
          'name': 'timelockId',
          'type': 'u32'
        }
      ]
    },
    {
      'name': 'timelockCountOf',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        }
      ]
    },
    {
      'name': 'unlockedBalanceOf',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        }
      ]
    },
    {
      'name': 'lockedBalanceOf',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        }
      ]
    },
    {
      'name': 'balanceOf',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        }
      ]
    },
    {
      'name': 'unlockedBalanceOfTimelock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        },
        {
          'name': 'timelockId',
          'type': 'u32'
        }
      ]
    },
    {
      'name': 'lockedBalanceOfTimelock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        },
        {
          'name': 'timelockId',
          'type': 'u32'
        }
      ]
    },
    {
      'name': 'balanceOfTimelock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'who',
          'type': 'publicKey'
        },
        {
          'name': 'timelockId',
          'type': 'u32'
        }
      ]
    },
    {
      'name': 'calculateUnlocked',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': [
        {
          'name': 'commence',
          'type': 'u64'
        },
        {
          'name': 'currentTime',
          'type': 'u64'
        },
        {
          'name': 'amount',
          'type': 'u64'
        },
        {
          'name': 'scheduleId',
          'type': 'u32'
        }
      ]
    }
  ],
  'accounts': [
    {
      'name': 'TokenLockData',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'mintAddress',
            'type': 'publicKey'
          },
          {
            'name': 'escrowAccount',
            'type': 'publicKey'
          },
          {
            'name': 'bumpSeed',
            'type': 'u8'
          },
          {
            'name': 'maxReleaseDelay',
            'type': 'u64'
          },
          {
            'name': 'minTimelockAmount',
            'type': 'u64'
          },
          {
            'name': 'releaseSchedules',
            'type': {
              'vec': {
                'defined': 'ReleaseSchedule'
              }
            }
          },
          {
            'name': 'timelocks',
            'type': {
              'vec': {
                'defined': 'TimelockEntry'
              }
            }
          }
        ]
      }
    }
  ],
  'types': [
    {
      'name': 'ReleaseSchedule',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'releaseCount',
            'type': 'u32'
          },
          {
            'name': 'delayUntilFirstReleaseInSeconds',
            'type': 'u64'
          },
          {
            'name': 'initialReleasePortionInBips',
            'type': 'u32'
          },
          {
            'name': 'periodBetweenReleasesInSeconds',
            'type': 'u64'
          },
          {
            'name': 'signerHash',
            'type': {
              'array': [
                'u8',
                20
              ]
            }
          }
        ]
      }
    },
    {
      'name': 'Timelock',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'scheduleId',
            'type': 'u32'
          },
          {
            'name': 'commencementTimestamp',
            'type': 'u64'
          },
          {
            'name': 'tokensTransferred',
            'type': 'u64'
          },
          {
            'name': 'totalAmount',
            'type': 'u64'
          },
          {
            'name': 'cancelableBy',
            'type': {
              'vec': 'publicKey'
            }
          },
          {
            'name': 'signerHash',
            'type': {
              'array': [
                'u8',
                20
              ]
            }
          }
        ]
      }
    },
    {
      'name': 'TimelockEntry',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'target',
            'type': 'publicKey'
          },
          {
            'name': 'locks',
            'type': {
              'vec': {
                'defined': 'Timelock'
              }
            }
          }
        ]
      }
    }
  ],
  'events': [
    {
      'name': 'EventCreateSchedule',
      'fields': [
        {
          'name': 'scheduleId',
          'type': 'u32',
          'index': false
        }
      ]
    },
    {
      'name': 'EventGetScheduleCount',
      'fields': [
        {
          'name': 'scheduleCount',
          'type': 'u32',
          'index': false
        }
      ]
    },
    {
      'name': 'EventFundReleaseSchedule',
      'fields': [
        {
          'name': 'funder',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'to',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'scheduleId',
          'type': 'u32',
          'index': false
        },
        {
          'name': 'amount',
          'type': 'u64',
          'index': false
        },
        {
          'name': 'commence',
          'type': 'u64',
          'index': false
        },
        {
          'name': 'timelockId',
          'type': 'u32',
          'index': false
        }
      ]
    },
    {
      'name': 'EventTimelockOf',
      'fields': [
        {
          'name': 'scheduleId',
          'type': 'u32',
          'index': false
        },
        {
          'name': 'commencementTimestamp',
          'type': 'u64',
          'index': false
        },
        {
          'name': 'tokensTransferred',
          'type': 'u64',
          'index': false
        },
        {
          'name': 'totalAmount',
          'type': 'u64',
          'index': false
        },
        {
          'name': 'cancelableBy',
          'type': {
            'vec': 'publicKey'
          },
          'index': false
        }
      ]
    },
    {
      'name': 'EventTimelockCountOf',
      'fields': [
        {
          'name': 'count',
          'type': 'u32',
          'index': false
        }
      ]
    },
    {
      'name': 'EventCancelTimelock',
      'fields': [
        {
          'name': 'cancelBy',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'target',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'timelockId',
          'type': 'u32',
          'index': false
        },
        {
          'name': 'reclaimer',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'canceledAmount',
          'type': 'u64',
          'index': false
        },
        {
          'name': 'paidAmount',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventTransfer',
      'fields': [
        {
          'name': 'from',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'to',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'amount',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventTransferTimelock',
      'fields': [
        {
          'name': 'from',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'timelockId',
          'type': 'u32',
          'index': false
        },
        {
          'name': 'to',
          'type': 'publicKey',
          'index': false
        },
        {
          'name': 'amount',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventUnlockedBalanceOf',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventLockedBalanceOf',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventBalanceOf',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventBalanceOfTimelock',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventUnlockedBalanceOfTimelock',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventLockedBalanceOfTimelock',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    },
    {
      'name': 'EventCalculateUnlocked',
      'fields': [
        {
          'name': 'bal',
          'type': 'u64',
          'index': false
        }
      ]
    }
  ],
  'errors': [
    {
      'code': 6000,
      'name': 'InvalidTokenlockAccount',
      'msg': 'invalid tokenlock account data'
    },
    {
      'code': 6001,
      'name': 'StateSizeLimited',
      'msg': 'state data size reached to max'
    },
    {
      'code': 6002,
      'name': 'MaxReleaseDelayLessThanOne',
      'msg': 'max release delay must be great than 1'
    },
    {
      'code': 6003,
      'name': 'AmountLessThanMinFunding',
      'msg': 'amount < min funding'
    },
    {
      'code': 6004,
      'name': 'InvalidScheduleId',
      'msg': 'invalid scheduleId'
    },
    {
      'code': 6005,
      'name': 'PerReleaseTokenLessThanOne',
      'msg': 'per release token less than 1'
    },
    {
      'code': 6006,
      'name': 'CommencementTimeoutOfRange',
      'msg': 'commencement time out of range'
    },
    {
      'code': 6007,
      'name': 'InitialReleaseTimeoutOfRange',
      'msg': 'initial release out of range'
    },
    {
      'code': 6008,
      'name': 'Max10CancelableAddresses',
      'msg': 'max 10 cancelableBy addressees'
    },
    {
      'code': 6009,
      'name': 'InvalidTimelockId',
      'msg': 'invalid timelock id'
    },
    {
      'code': 6010,
      'name': 'TimelockHasntValue',
      'msg': 'Timelock has no value left'
    },
    {
      'code': 6011,
      'name': 'HasntCancelTimelockPermission',
      'msg': 'You are not allowed to cancel this timelock'
    },
    {
      'code': 6012,
      'name': 'MisMatchedArrayLength',
      'msg': 'mismatched array length'
    },
    {
      'code': 6013,
      'name': 'AmountBigThanUnlocked',
      'msg': 'amount big than unlocked'
    },
    {
      'code': 6014,
      'name': 'AmountMustBigThanZero',
      'msg': 'amount must big than zero'
    },
    {
      'code': 6015,
      'name': 'BadTransfer',
      'msg': 'Bad transfer'
    },
    {
      'code': 6016,
      'name': 'FirstReleaseDelayLessThanZero',
      'msg': 'first release delay < 0'
    },
    {
      'code': 6017,
      'name': 'ReleasePeriodLessThanZero',
      'msg': 'Release Period < 0'
    },
    {
      'code': 6018,
      'name': 'FirstReleaseDelayBigThanMaxDelay',
      'msg': 'first release > max delay'
    },
    {
      'code': 6019,
      'name': 'ReleaseCountLessThanOne',
      'msg': 'release count less than 1'
    },
    {
      'code': 6020,
      'name': 'InitReleasePortionBigThan100Perent',
      'msg': 'init release potion big than 100%'
    },
    {
      'code': 6021,
      'name': 'ReleasePeriodZero',
      'msg': 'release period is zero'
    },
    {
      'code': 6022,
      'name': 'InitReleasePortionMustBe100Perent',
      'msg': 'init release potion must be 100%'
    },
    {
      'code': 6023,
      'name': 'AmountBigThanAllowance',
      'msg': 'amount big than allowance'
    },
    {
      'code': 6024,
      'name': 'ThereIsNoAllowance',
      'msg': 'there is no allowance'
    },
    {
      'code': 6025,
      'name': 'DecreaseBigThanAllowance',
      'msg': 'decrease > allowance'
    },
    {
      'code': 6026,
      'name': 'NFTNotAWhitelisted',
      'msg': 'NFT not a whitelisted'
    },
    {
      'code': 6027,
      'name': 'NFTAleadyWhitelisted',
      'msg': 'NFT already whitelisted'
    },
    {
      'code': 6028,
      'name': 'ValidatorAleadyExist',
      'msg': 'validator already exist'
    },
    {
      'code': 6029,
      'name': 'ValidatorsMustbeGreatThanThreshold',
      'msg': 'Validators must be great than threshold!'
    },
    {
      'code': 6030,
      'name': 'GivenAddressIsNotValid',
      'msg': 'Given address is not valid!'
    },
    {
      'code': 6031,
      'name': 'BalanceIsInsufficient',
      'msg': 'balance is insufficient!'
    },
    {
      'code': 6032,
      'name': 'MisMatchToken',
      'msg': 'mismatch token!'
    },
    {
      'code': 6033,
      'name': 'FundToSameAddress',
      'msg': 'fund to same address!'
    },
    {
      'code': 6034,
      'name': 'AlreadyExistHash',
      'msg': 'already exist hash!'
    }
  ]
}

module.exports = { TOKEN_LOCKUP_ABI }
