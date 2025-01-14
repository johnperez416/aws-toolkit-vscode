/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode'
import { CodeScanIssue, AggregatedCodeScanIssue } from '../models/model'

interface SecurityScanRender {
    securityDiagnosticCollection: vscode.DiagnosticCollection | undefined
    initialized: boolean
}

export const securityScanRender: SecurityScanRender = {
    securityDiagnosticCollection: undefined,
    initialized: false,
}

export function initSecurityScanRender(
    securityRecommendationList: AggregatedCodeScanIssue[],
    context: vscode.ExtensionContext
) {
    securityScanRender.initialized = false
    securityScanRender.securityDiagnosticCollection?.clear()
    securityRecommendationList.forEach(securityRecommendation => {
        updateSecurityDiagnosticCollection(securityRecommendation)
    })
    securityScanRender.initialized = true
}

export function updateSecurityDiagnosticCollection(securityRecommendation: AggregatedCodeScanIssue) {
    const filePath = securityRecommendation.filePath
    const uri = vscode.Uri.file(filePath)
    const securityDiagnosticCollection = createSecurityDiagnosticCollection()
    const securityDiagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(uri)
    securityRecommendation.issues.forEach(securityIssue => {
        securityDiagnostics.push(createSecurityDiagnostic(securityIssue))
    })
    securityDiagnosticCollection.set(uri, securityDiagnostics)
}

export function createSecurityDiagnostic(securityIssue: CodeScanIssue) {
    const range = new vscode.Range(securityIssue.startLine, 0, securityIssue.endLine, 0)
    const securityDiagnostic: vscode.Diagnostic = new vscode.Diagnostic(
        range,
        securityIssue.comment,
        vscode.DiagnosticSeverity.Warning
    )
    securityDiagnostic.source = 'Detected by CodeWhisperer '
    return securityDiagnostic
}

export function createSecurityDiagnosticCollection() {
    if (securityScanRender.securityDiagnosticCollection === undefined) {
        securityScanRender.securityDiagnosticCollection =
            vscode.languages.createDiagnosticCollection('CodeWhisperer Security Scan')
    }
    return securityScanRender.securityDiagnosticCollection
}

export function disposeSecurityDiagnostic(event: vscode.TextDocumentChangeEvent) {
    const uri = event.document.uri
    if (!securityScanRender.initialized || !securityScanRender.securityDiagnosticCollection?.has(uri)) return
    const currentSecurityDiagnostics = securityScanRender.securityDiagnosticCollection?.get(uri)
    const newSecurityDiagnostics: vscode.Diagnostic[] = []
    const changedRange = event.contentChanges[0].range
    const changedText = event.contentChanges[0].text
    const lineOffset = getLineOffset(changedRange, changedText)

    currentSecurityDiagnostics?.forEach(issue => {
        const intersection = changedRange.intersection(issue.range)
        if (
            issue.severity === vscode.DiagnosticSeverity.Warning &&
            intersection &&
            (/\S/.test(changedText) || changedText === '')
        ) {
            issue.severity = vscode.DiagnosticSeverity.Information
            issue.message = 'Re-scan to validate the fix: ' + issue.message
            issue.range = new vscode.Range(intersection.start, intersection.start)
        } else if (issue.range.start.line >= changedRange.end.line) {
            issue.range = new vscode.Range(
                issue.range.start.line + lineOffset,
                issue.range.start.character,
                issue.range.end.line + lineOffset,
                issue.range.end.character
            )
        }
        newSecurityDiagnostics.push(issue)
    })
    securityScanRender.securityDiagnosticCollection?.set(uri, newSecurityDiagnostics)
}

function getLineOffset(range: vscode.Range, text: string) {
    const originLines = range.end.line - range.start.line + 1
    const changedLines = text.split('\n').length
    return changedLines - originLines
}
