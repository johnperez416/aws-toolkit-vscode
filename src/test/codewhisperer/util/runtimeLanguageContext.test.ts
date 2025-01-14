/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import { resetCodeWhispererGlobalVariables } from '../testUtil'
import { runtimeLanguageContext, RuntimeLanguageContext } from '../../../codewhisperer/util/runtimeLanguageContext'
import * as codewhispererClient from '../../../codewhisperer/client/codewhispererclient'

describe('runtimeLanguageContext', function () {
    const languageContext = new RuntimeLanguageContext()

    describe('test isLanguageSupported', function () {
        const cases: [string, boolean][] = [
            ['java', true],
            ['javascript', true],
            ['typescript', true],
            ['jsx', true],
            ['javascriptreact', true],
            ['python', true],
            ['ruby', false],
            ['plaintext', false],
            ['cpp', false],
        ]

        beforeEach(function () {
            resetCodeWhispererGlobalVariables()
        })

        cases.forEach(tuple => {
            const languageId = tuple[0]
            const expected = tuple[1]

            it(`should ${expected ? '' : 'not'} support ${languageId}`, function () {
                const actual = languageContext.isLanguageSupported(languageId)
                assert.strictEqual(actual, expected)
            })
        })
    })

    describe('test getLanguageContext', function () {
        const cases = [
            ['java', 'java'],
            ['python', 'python'],
            ['javascript', 'javascript'],
            ['typescript', 'javascript'],
            ['javascriptreact', 'jsx'],
            ['plaintext', 'plaintext'],
            ['ruby', 'plaintext'],
            ['cpp', 'plaintext'],
            ['c', 'plaintext'],
            [undefined, 'plaintext'],
        ]

        cases.forEach(tuple => {
            const vscLanguageId = tuple[0]
            const expectedCwsprLanguageId = tuple[1]
            it(`given vscLanguage ${vscLanguageId} should return ${expectedCwsprLanguageId}`, function () {
                const result = runtimeLanguageContext.getLanguageContext(vscLanguageId)
                assert.strictEqual(result.language as string, expectedCwsprLanguageId)
            })
        })
    })

    describe('mapVscLanguageToCodeWhispererLanguage', function () {
        const cases = [
            [undefined, undefined],
            ['typescript', 'javascript'],
            ['javascriptreact', 'jsx'],
            ['go', undefined],
            ['java', 'java'],
            ['javascript', 'javascript'],
            ['python', 'python'],
            ['c', undefined],
            ['cpp', undefined],
        ]

        beforeEach(function () {
            resetCodeWhispererGlobalVariables()
        })

        for (const [languageId, expected] of cases) {
            it(`should return ${expected} if languageId is ${languageId}`, function () {
                const actual = languageContext.mapVscLanguageToCodeWhispererLanguage(languageId)
                assert.strictEqual(actual, expected)
            })
        }
    })

    // for now we will only have typescript, jsx mapped to javascript, all other language should remain the same
    describe('test covertCwsprRequest', function () {
        const leftFileContent = 'left'
        const rightFileContent = 'right'
        const filename = 'test'
        const cases: [originalLanguage: string, mappedLanguage: string][] = [
            ['java', 'java'],
            ['python', 'python'],
            ['javascript', 'javascript'],
            ['jsx', 'javascript'],
            ['typescript', 'javascript'],
            ['plaintext', 'plaintext'],
            ['arbitrary string', 'arbitrary string'],
        ]

        this.beforeEach(function () {
            resetCodeWhispererGlobalVariables()
        })

        for (const [originalLanguage, mappedLanguage] of cases) {
            it(`convert ListRecommendationRequest - ${originalLanguage} should map to ${mappedLanguage}`, function () {
                const originalRequest: codewhispererClient.ListRecommendationsRequest = {
                    fileContext: {
                        leftFileContent: leftFileContent,
                        rightFileContent: rightFileContent,
                        filename: filename,
                        programmingLanguage: { languageName: originalLanguage },
                    },
                    maxResults: 1,
                    nextToken: 'token',
                }
                const actual = languageContext.mapToRuntimeLanguage(originalRequest)
                const expected: codewhispererClient.ListRecommendationsRequest = {
                    ...originalRequest,
                    fileContext: {
                        ...originalRequest.fileContext,
                        programmingLanguage: { languageName: mappedLanguage },
                    },
                }
                assert.deepStrictEqual(actual, expected)
            })

            it(`convert GenerateRecommendationsRequest - ${originalLanguage} should map to ${mappedLanguage}`, function () {
                const originalRequest: codewhispererClient.GenerateRecommendationsRequest = {
                    fileContext: {
                        leftFileContent: leftFileContent,
                        rightFileContent: rightFileContent,
                        filename: filename,
                        programmingLanguage: { languageName: originalLanguage },
                    },
                    maxResults: 1,
                }
                const actual = languageContext.mapToRuntimeLanguage(originalRequest)
                const expected: codewhispererClient.GenerateRecommendationsRequest = {
                    ...originalRequest,
                    fileContext: {
                        ...originalRequest.fileContext,
                        programmingLanguage: { languageName: mappedLanguage },
                    },
                }
                assert.deepStrictEqual(actual, expected)
            })
        }
    })
})
