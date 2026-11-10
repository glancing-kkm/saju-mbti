// macOS PDFKit check of the actual PDF bytes, independent of the HTML preview.
// Usage: swift tools/inspect-review-pdfs.swift /tmp/saju-live-complete
import Foundation
import AppKit
import PDFKit

let directory = CommandLine.arguments[1]
let files = try FileManager.default.contentsOfDirectory(atPath: directory).filter { $0.hasSuffix(".pdf") }.sorted()
var rows = [[String: Any]]()
for file in files {
    guard let document = PDFDocument(url: URL(fileURLWithPath: directory + "/" + file)), document.pageCount > 0 else {
        fatalError("Unreadable PDF: " + file)
    }
    let text = (0..<document.pageCount).map { document.page(at: $0)?.string ?? "" }
    guard text.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else {
        fatalError("PDF contains a page without extractable text: " + file)
    }
    rows.append(["file": file, "pages": document.pageCount, "extractedCharacters": text.reduce(0) { $0 + $1.count }, "pageCharacters": text.map { $0.count }])
    for index in Set([0, document.pageCount / 2, document.pageCount - 1]) {
        let image = document.page(at: index)!.thumbnail(of: NSSize(width: 794, height: 1123), for: .mediaBox)
        if let data = image.tiffRepresentation, let representation = NSBitmapImageRep(data: data), let png = representation.representation(using: .png, properties: [:]) {
            try png.write(to: URL(fileURLWithPath: directory + "/" + file + ".native-" + String(index + 1) + ".png"))
        }
    }
}
let result = try JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted, .sortedKeys])
try result.write(to: URL(fileURLWithPath: directory + "/pdf-native-check.json"))
print("PDFKit verified \(rows.count) PDFs: every page contains extractable text; representative PDF pages rendered.")
