require 'json'

Pod::Spec.new do |s|
  s.name           = 'MoraLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Mora Live Activity native module'
  s.description    = 'Native ActivityKit bridge for Mora order Live Activities'
  s.author         = 'Mora'
  s.homepage       = 'https://moramoda.tech'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
