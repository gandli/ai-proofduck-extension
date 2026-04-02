Feature: Translation Functionality

  Background:
    Given the extension is installed and enabled
    And the user has granted necessary permissions

  Scenario: User translates text from English to Chinese
    Given the user has the extension popup open
    When the user selects "English" as source language
    And the user selects "Chinese" as target language
    And the user enters "Hello, world!" in the input field
    And the user clicks the translate button
    Then the translation result should be displayed
    And the result should contain "你好"

  Scenario: User translates text from Chinese to English
    Given the user has the extension popup open
    When the user selects "Chinese" as source language
    And the user selects "English" as target language
    And the user enters "你好，世界！" in the input field
    And the user clicks the translate button
    Then the translation result should be displayed
    And the result should contain "Hello"

  Scenario: User switches between tabs
    Given the user has the extension popup open
    When the user clicks on the "Proofreading" tab
    Then the proofreading input field should be visible
    When the user clicks on the "Polishing" tab
    Then the polishing input field should be visible
    When the user clicks on the "Translation" tab
    Then the translation input field should be visible

  Scenario: User copies translation result to clipboard
    Given the user has completed a translation
    When the user clicks the copy button
    Then the translation should be copied to clipboard
    And a "Copied!" indicator should be shown

  Scenario: User speaks translation result
    Given the user has completed a translation
    When the user clicks the speak button
    Then the translation should be read aloud

  Scenario: Translation handles long text
    Given the user has the extension popup open
    When the user enters text longer than 5000 characters
    Then a warning should be displayed about text length
    And the user should be able to continue or truncate

  Scenario: Translation API error handling
    Given the translation service is unavailable
    When the user attempts to translate
    Then an error message should be displayed
    And the user should be able to retry