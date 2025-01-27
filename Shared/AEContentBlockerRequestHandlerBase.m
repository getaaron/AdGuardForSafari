//
//  AEContentBlockerRequestHandlerBase.m
//  shared
//
//  Created by Dimitry Kolyshev on 01.08.2019.
//  Copyright © 2019 Adguard Software Ltd. All rights reserved.
//

#import "AEContentBlockerRequestHandlerBase.h"
#import "AESharedResources.h"

@interface AEContentBlockerRequestHandlerBase ()

@end

@implementation AEContentBlockerRequestHandlerBase

- (void)beginRequestWithExtensionContext:(NSExtensionContext *)context {
    NSItemProvider *attachment;
    
    if ([[AESharedResources sharedDefaults] boolForKey:AEDefaultsEnabled]) {
        attachment = [[NSItemProvider alloc] initWithContentsOfURL:self.blockingContentRulesUrl];
    }
    else {
        attachment = [[NSItemProvider alloc] initWithContentsOfURL:self.blockingContentEmptyResourceUrl];
    }
    if (attachment) {
        NSExtensionItem *item = [[NSExtensionItem alloc] init];
        item.attachments = @[attachment];
        
        [context completeRequestReturningItems:@[item] completionHandler:nil];
        return;
    }
    
    [context completeRequestReturningItems:nil completionHandler:nil];
}

- (NSURL *)blockingContentRulesUrl {
    return AESharedResources.blockingContentRulesUrl;
}

- (NSURL *)blockingContentEmptyResourceUrl {
    return AESharedResources.blockingContentRulesEmptyUrl;
}

@end
