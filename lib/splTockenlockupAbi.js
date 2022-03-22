const TOKEN_LOCKUP_ABI = {
  'version': '0.1.0',
  'name': 'tokenlock',
  'instructions': [
    {
      'name': 'initializeTokenlock',
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
      'name': 'initializeTimelock',
      'accounts': [
        {
          'name': 'tokenlockAccount',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'timelockAccount',
          'isMut': true,
          'isSigner': false
        },
        {
          'name': 'authority',
          'isMut': true,
          'isSigner': true
        },
        {
          'name': 'targetAccount',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'systemProgram',
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'rent',
          'isMut': false,
          'isSigner': false
        }
      ],
      'args': []
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
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'timelockAccount',
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
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'timelockAccount',
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
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'timelockAccount',
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
          'isMut': false,
          'isSigner': false
        },
        {
          'name': 'timelockAccount',
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
          'name': 'targetAssoc',
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
          }
        ]
      }
    },
    {
      'name': 'TimelockData',
      'type': {
        'kind': 'struct',
        'fields': [
          {
            'name': 'tokenlockAccount',
            'type': 'publicKey'
          },
          {
            'name': 'targetAccount',
            'type': 'publicKey'
          },
          {
            'name': 'cancelables',
            'type': {
              'vec': 'publicKey'
            }
          },
          {
            'name': 'timelocks',
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
            'type': 'u16'
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
            'name': 'cancelableByCount',
            'type': 'u8'
          },
          {
            'name': 'cancelableBy',
            'type': {
              'array': [
                'u8',
                10
              ]
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
    }
  ],
  'errors': [
    {
      'code': 6000,
      'name': 'InvalidTokenlockAccount',
      'msg': 'Invalid tokenlock account data'
    },
    {
      'code': 6001,
      'name': 'MaxReleaseDelayLessThanOne',
      'msg': 'Max release delay must be greater or equal to 1'
    },
    {
      'code': 6002,
      'name': 'AmountLessThanMinFunding',
      'msg': 'Amount < min funding'
    },
    {
      'code': 6003,
      'name': 'InsufficientTokenLockDataSpace',
      'msg': 'Insufficient data space, Tokenlock account is full'
    },
    {
      'code': 6004,
      'name': 'InsufficientDataSpace',
      'msg': 'Insufficient data space, Timelock account is full'
    },
    {
      'code': 6005,
      'name': 'InvalidScheduleId',
      'msg': 'Invalid scheduleId'
    },
    {
      'code': 6006,
      'name': 'PerReleaseTokenLessThanOne',
      'msg': 'Per release token less than 1'
    },
    {
      'code': 6007,
      'name': 'CommencementTimeoutOfRange',
      'msg': 'Commencement time out of range'
    },
    {
      'code': 6008,
      'name': 'InitialReleaseTimeoutOfRange',
      'msg': 'Initial release out of range'
    },
    {
      'code': 6009,
      'name': 'Max10CancelableAddresses',
      'msg': 'Max 10 cancelableBy addressees'
    },
    {
      'code': 6010,
      'name': 'InvalidTimelockId',
      'msg': 'Invalid timelock id'
    },
    {
      'code': 6011,
      'name': 'TimelockHasntValue',
      'msg': 'Timelock has no value left'
    },
    {
      'code': 6012,
      'name': 'HasntCancelTimelockPermission',
      'msg': 'You are not allowed to cancel this timelock'
    },
    {
      'code': 6013,
      'name': 'AmountBiggerThanUnlocked',
      'msg': 'Amount bigger than unlocked'
    },
    {
      'code': 6014,
      'name': 'AmountMustBeBiggerThanZero',
      'msg': 'Amount must be bigger than zero'
    },
    {
      'code': 6015,
      'name': 'BadTransfer',
      'msg': 'Bad transfer'
    },
    {
      'code': 6016,
      'name': 'FirstReleaseDelayLessThanZero',
      'msg': 'First release delay < 0'
    },
    {
      'code': 6017,
      'name': 'ReleasePeriodLessThanZero',
      'msg': 'Release Period < 0'
    },
    {
      'code': 6018,
      'name': 'FirstReleaseDelayBiggerThanMaxDelay',
      'msg': 'First release > max delay'
    },
    {
      'code': 6019,
      'name': 'ReleaseCountLessThanOne',
      'msg': 'Release count less than 1'
    },
    {
      'code': 6020,
      'name': 'InitReleasePortionBiggerThan100Percent',
      'msg': 'Init release portion bigger than 100%'
    },
    {
      'code': 6021,
      'name': 'ReleasePeriodZero',
      'msg': 'Release period is zero'
    },
    {
      'code': 6022,
      'name': 'InitReleasePortionMustBe100Percent',
      'msg': 'Init release portion must be 100%'
    },
    {
      'code': 6023,
      'name': 'BalanceIsInsufficient',
      'msg': 'Balance is insufficient!'
    },
    {
      'code': 6024,
      'name': 'MisMatchedToken',
      'msg': 'Mismatched token!'
    },
    {
      'code': 6025,
      'name': 'MisMatchedEscrow',
      'msg': 'Mismatched escrow account!'
    },
    {
      'code': 6026,
      'name': 'HashAlreadyExists',
      'msg': 'Hash already exists!'
    },
    {
      'code': 6027,
      'name': 'DuplicatedCancelable',
      'msg': 'Duplicated cancelable!'
    },
    {
      'code': 6028,
      'name': 'SchedulesCountReachedMax',
      'msg': 'Schedules count reached maximium.'
    },
    {
      'code': 6029,
      'name': 'CancelablesCountReachedMax',
      'msg': 'Cancelables count reached maximium.'
    }
  ],
  'metadata': {
    'address': '4QgQccJJrCJTULHqWuozBGxjeKPWAdfTT35HA2Kcovos'
  }
}

// export TOKEN_LOCKUP_ABI
module.exports = { TOKEN_LOCKUP_ABI }
